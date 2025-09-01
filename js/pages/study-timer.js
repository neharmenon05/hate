import { supabase } from '../supabase-client.js';
import { showError, showSuccess, formatTime } from '../utils.js';

export class StudyTimerPage {
    constructor(user, profile) {
        this.user = user;
        this.profile = profile;
        this.timer = null;
        this.timeRemaining = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.currentSession = 'work';
        this.workDuration = 25 * 60; // 25 minutes in seconds
        this.shortBreakDuration = 5 * 60; // 5 minutes
        this.longBreakDuration = 15 * 60; // 15 minutes
        this.sessionsCompleted = 0;
        this.currentSessionStart = null;
    }

    async render() {
        const pageContent = document.getElementById('page-content');
        
        pageContent.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Study Timer</h1>
                <p class="page-subtitle">Boost your productivity with the Pomodoro Technique</p>
            </div>

            <div class="grid grid-cols-2 mb-4">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Timer Settings</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label for="work-duration">Work Duration (minutes)</label>
                            <input type="number" id="work-duration" value="25" min="1" max="60">
                        </div>
                        <div class="form-group">
                            <label for="short-break-duration">Short Break (minutes)</label>
                            <input type="number" id="short-break-duration" value="5" min="1" max="30">
                        </div>
                        <div class="form-group">
                            <label for="long-break-duration">Long Break (minutes)</label>
                            <input type="number" id="long-break-duration" value="15" min="5" max="60">
                        </div>
                        <button class="btn btn-secondary" id="apply-settings-btn">Apply Settings</button>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Session Stats</h3>
                    </div>
                    <div class="card-body">
                        <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
                            <div class="text-center">
                                <span class="stat-number" style="font-size: 2rem;" id="sessions-today">0</span>
                                <div class="stat-label">Sessions Today</div>
                            </div>
                            <div class="text-center">
                                <span class="stat-number" style="font-size: 2rem;" id="total-time-today">0h</span>
                                <div class="stat-label">Time Studied</div>
                            </div>
                        </div>
                        <div class="text-center mt-3">
                            <div class="progress">
                                <div class="progress-bar" id="daily-progress" style="width: 0%"></div>
                            </div>
                            <div class="stat-label mt-1">Daily Goal Progress</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-body text-center">
                    <div class="timer-session-indicator">
                        <h2 id="session-type" style="color: var(--primary-600); margin-bottom: var(--space-2);">Work Session</h2>
                        <div class="session-counter">
                            <span style="color: var(--gray-600);">Pomodoros completed: </span>
                            <span id="pomodoro-count" style="font-weight: 600;">0</span>
                        </div>
                    </div>
                    
                    <div class="timer-display" id="timer-display">25:00</div>
                    
                    <div class="timer-controls">
                        <button class="btn btn-lg btn-primary" id="start-pause-btn">Start</button>
                        <button class="btn btn-lg btn-secondary" id="reset-btn">Reset</button>
                        <button class="btn btn-lg btn-accent" id="skip-btn">Skip</button>
                    </div>

                    <div style="margin-top: var(--space-4);">
                        <div class="alert alert-info" id="timer-instructions">
                            <strong>How it works:</strong> Work for 25 minutes, then take a 5-minute break. 
                            After 4 work sessions, take a longer 15-minute break.
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Recent Sessions</h3>
                    </div>
                    <div class="card-body">
                        <div id="recent-sessions">
                            <p class="text-center">Loading...</p>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Study Tips</h3>
                    </div>
                    <div class="card-body">
                        <ul style="list-style: none; padding: 0;">
                            <li style="margin-bottom: var(--space-2); display: flex; align-items: flex-start;">
                                <span style="margin-right: var(--space-2);">🎯</span>
                                <div>
                                    <strong>Stay Focused:</strong> Avoid distractions during work sessions
                                </div>
                            </li>
                            <li style="margin-bottom: var(--space-2); display: flex; align-items: flex-start;">
                                <span style="margin-right: var(--space-2);">📱</span>
                                <div>
                                    <strong>Phone Away:</strong> Keep your phone in another room
                                </div>
                            </li>
                            <li style="margin-bottom: var(--space-2); display: flex; align-items: flex-start;">
                                <span style="margin-right: var(--space-2);">💧</span>
                                <div>
                                    <strong>Stay Hydrated:</strong> Use breaks to drink water and stretch
                                </div>
                            </li>
                            <li style="margin-bottom: var(--space-2); display: flex; align-items: flex-start;">
                                <span style="margin-right: var(--space-2);">📝</span>
                                <div>
                                    <strong>Plan Tasks:</strong> Decide what to work on before starting
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        await this.loadStats();
        await this.loadRecentSessions();
        this.setupEventListeners();
        this.initializeTimer();
    }

    setupEventListeners() {
        document.getElementById('start-pause-btn').addEventListener('click', () => {
            this.toggleTimer();
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetTimer();
        });

        document.getElementById('skip-btn').addEventListener('click', () => {
            this.skipSession();
        });

        document.getElementById('apply-settings-btn').addEventListener('click', () => {
            this.applySettings();
        });
    }

    initializeTimer() {
        this.timeRemaining = this.workDuration;
        this.updateDisplay();
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        if (!this.isRunning && !this.isPaused) {
            // Starting a new session
            this.currentSessionStart = new Date();
        }

        this.isRunning = true;
        this.isPaused = false;
        
        document.getElementById('start-pause-btn').textContent = 'Pause';
        
        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateDisplay();
            
            if (this.timeRemaining <= 0) {
                this.completeSession();
            }
        }, 1000);
    }

    pauseTimer() {
        this.isRunning = false;
        this.isPaused = true;
        
        clearInterval(this.timer);
        document.getElementById('start-pause-btn').textContent = 'Resume';
    }

    resetTimer() {
        this.isRunning = false;
        this.isPaused = false;
        
        clearInterval(this.timer);
        
        if (this.currentSession === 'work') {
            this.timeRemaining = this.workDuration;
        } else if (this.currentSession === 'shortBreak') {
            this.timeRemaining = this.shortBreakDuration;
        } else {
            this.timeRemaining = this.longBreakDuration;
        }
        
        document.getElementById('start-pause-btn').textContent = 'Start';
        this.updateDisplay();
    }

    async completeSession() {
        this.isRunning = false;
        clearInterval(this.timer);

        // Save completed session to database
        if (this.currentSession === 'work') {
            await this.saveStudySession();
            this.sessionsCompleted++;
            document.getElementById('pomodoro-count').textContent = this.sessionsCompleted;
        }

        // Play notification sound (if browser supports it)
        this.playNotification();

        // Show completion message
        this.showSessionComplete();

        // Move to next session
        this.nextSession();
    }

    async saveStudySession() {
        try {
            const sessionData = {
                user_id: this.user.id,
                session_type: 'pomodoro',
                duration_minutes: Math.floor(this.workDuration / 60),
                completed: true,
                started_at: this.currentSessionStart,
                completed_at: new Date()
            };

            const { error } = await supabase
                .from('study_sessions')
                .insert([sessionData]);

            if (error) throw error;
        } catch (error) {
            console.error('Error saving study session:', error);
        }
    }

    playNotification() {
        // Create audio context for notification
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('Could not play notification sound');
        }

        // Browser notification
        if (Notification.permission === 'granted') {
            new Notification('StudyHub Timer', {
                body: `${this.currentSession === 'work' ? 'Work' : 'Break'} session completed!`,
                icon: '/vite.svg'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('StudyHub Timer', {
                        body: `${this.currentSession === 'work' ? 'Work' : 'Break'} session completed!`,
                        icon: '/vite.svg'
                    });
                }
            });
        }
    }

    showSessionComplete() {
        const sessionType = this.currentSession === 'work' ? 'Work' : 'Break';
        showSuccess(`${sessionType} session completed! Great job! 🎉`);
    }

    nextSession() {
        if (this.currentSession === 'work') {
            // After work, check if it's time for long break
            if (this.sessionsCompleted % 4 === 0) {
                this.currentSession = 'longBreak';
                this.timeRemaining = this.longBreakDuration;
            } else {
                this.currentSession = 'shortBreak';
                this.timeRemaining = this.shortBreakDuration;
            }
        } else {
            // After any break, go back to work
            this.currentSession = 'work';
            this.timeRemaining = this.workDuration;
        }

        this.updateSessionDisplay();
        this.updateDisplay();
        document.getElementById('start-pause-btn').textContent = 'Start';
    }

    skipSession() {
        this.isRunning = false;
        this.isPaused = false;
        clearInterval(this.timer);
        
        this.nextSession();
        showSuccess('Session skipped!');
    }

    updateDisplay() {
        const display = document.getElementById('timer-display');
        display.textContent = formatTime(this.timeRemaining);
        
        // Update document title
        document.title = `${formatTime(this.timeRemaining)} - StudyHub Timer`;
    }

    updateSessionDisplay() {
        const sessionTypeElement = document.getElementById('session-type');
        
        if (this.currentSession === 'work') {
            sessionTypeElement.textContent = 'Work Session';
            sessionTypeElement.style.color = 'var(--primary-600)';
        } else if (this.currentSession === 'shortBreak') {
            sessionTypeElement.textContent = 'Short Break';
            sessionTypeElement.style.color = 'var(--accent-600)';
        } else {
            sessionTypeElement.textContent = 'Long Break';
            sessionTypeElement.style.color = 'var(--secondary-600)';
        }
    }

    applySettings() {
        const workMinutes = parseInt(document.getElementById('work-duration').value);
        const shortBreakMinutes = parseInt(document.getElementById('short-break-duration').value);
        const longBreakMinutes = parseInt(document.getElementById('long-break-duration').value);

        this.workDuration = workMinutes * 60;
        this.shortBreakDuration = shortBreakMinutes * 60;
        this.longBreakDuration = longBreakMinutes * 60;

        // Reset current timer with new settings
        this.resetTimer();
        showSuccess('Timer settings updated!');
    }

    async loadStats() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { data: sessions, error } = await supabase
                .from('study_sessions')
                .select('*')
                .eq('user_id', this.user.id)
                .gte('started_at', today.toISOString())
                .eq('completed', true);

            if (error) throw error;

            const completedSessions = sessions?.length || 0;
            const totalMinutes = sessions?.reduce((sum, session) => sum + session.duration_minutes, 0) || 0;
            const totalHours = Math.floor(totalMinutes / 60);
            const remainingMinutes = totalMinutes % 60;

            document.getElementById('sessions-today').textContent = completedSessions;
            document.getElementById('total-time-today').textContent = 
                totalHours > 0 ? `${totalHours}h ${remainingMinutes}m` : `${remainingMinutes}m`;

            // Update progress bar (assuming daily goal of 4 hours = 240 minutes)
            const dailyGoal = 240;
            const progress = Math.min((totalMinutes / dailyGoal) * 100, 100);
            document.getElementById('daily-progress').style.width = `${progress}%`;

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadRecentSessions() {
        try {
            const { data: sessions, error } = await supabase
                .from('study_sessions')
                .select('*')
                .eq('user_id', this.user.id)
                .order('started_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            this.renderRecentSessions(sessions || []);
        } catch (error) {
            console.error('Error loading recent sessions:', error);
        }
    }

    renderRecentSessions(sessions) {
        const container = document.getElementById('recent-sessions');
        
        if (sessions.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--gray-500);">No study sessions yet</p>';
            return;
        }

        container.innerHTML = sessions.map(session => {
            const startTime = new Date(session.started_at);
            const duration = session.duration_minutes;
            const status = session.completed ? 'Completed' : 'Incomplete';
            
            return `
                <div class="file-item" style="margin-bottom: var(--space-2); background: var(--gray-50);">
                    <div class="file-info">
                        <div class="file-icon" style="background-color: ${session.completed ? 'var(--success-500)' : 'var(--warning-500)'};">
                            ${session.completed ? '✅' : '⏱️'}
                        </div>
                        <div class="file-details">
                            <h4>${duration} minute session</h4>
                            <div class="file-meta">
                                ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                    <div class="tag ${session.completed ? 'tag-accent' : 'tag-secondary'}">
                        ${status}
                    </div>
                </div>
            `;
        }).join('');
    }

    cleanup() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        document.title = 'StudyHub - Cloud Learning Platform';
    }
}