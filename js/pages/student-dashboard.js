import { supabase } from '../supabase-client.js';
import { formatDate, showError } from '../utils.js';

export class StudentDashboard {
    constructor(user, profile) {
        this.user = user;
        this.profile = profile;
        this.data = {
            recentResources: [],
            upcomingAssignments: [],
            stats: {}
        };
    }

    async render() {
        const pageContent = document.getElementById('page-content');
        
        pageContent.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Welcome back, ${this.profile.full_name}!</h1>
                <p class="page-subtitle">Here's your study overview</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-number" id="total-resources">0</span>
                    <div class="stat-label">Resources Uploaded</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number" id="pending-assignments">0</span>
                    <div class="stat-label">Pending Assignments</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number" id="avg-grade">0</span>
                    <div class="stat-label">Average Grade</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number" id="study-hours">0</span>
                    <div class="stat-label">Study Hours</div>
                </div>
            </div>

            <div class="grid grid-cols-2">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Recent Resources</h3>
                        <a href="#" class="btn btn-sm btn-primary" data-page="resources">View All</a>
                    </div>
                    <div class="card-body">
                        <div id="recent-resources">
                            <p class="text-center">Loading...</p>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Upcoming Assignments</h3>
                        <a href="#" class="btn btn-sm btn-primary" data-page="assignments">View All</a>
                    </div>
                    <div class="card-body">
                        <div id="upcoming-assignments">
                            <p class="text-center">Loading...</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-3 mt-4">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Quick Actions</h3>
                    </div>
                    <div class="card-body">
                        <div style="display: flex; flex-direction: column; gap: var(--space-2);">
                            <button class="btn btn-primary" data-page="resources">Upload Resource</button>
                            <button class="btn btn-secondary" data-page="flashcards">Study Flashcards</button>
                            <button class="btn btn-accent" data-page="study-timer">Start Timer</button>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Study Streak</h3>
                    </div>
                    <div class="card-body">
                        <div class="text-center">
                            <span class="stat-number" style="font-size: 3rem;">7</span>
                            <div class="stat-label">Days in a row</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Recent Activity</h3>
                    </div>
                    <div class="card-body">
                        <div id="recent-activity">
                            <div style="font-size: 0.875rem; color: var(--gray-600);">
                                <p>📚 Uploaded Math notes</p>
                                <p>✅ Completed Physics assignment</p>
                                <p>🔥 Started study timer</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadDashboardData();
        this.setupEventListeners();
    }

    async loadDashboardData() {
        try {
            // Load stats
            await this.loadStats();
            
            // Load recent resources
            const { data: resources, error: resourcesError } = await supabase
                .from('resources')
                .select('*')
                .eq('uploaded_by', this.user.id)
                .order('created_at', { ascending: false })
                .limit(3);

            if (resourcesError) throw resourcesError;

            this.renderRecentResources(resources || []);

            // Load upcoming assignments
            const { data: assignments, error: assignmentsError } = await supabase
                .from('assignments')
                .select(`
                    *,
                    classes!inner(
                        name,
                        students!inner(student_id)
                    )
                `)
                .eq('classes.students.student_id', this.user.id)
                .gte('due_date', new Date().toISOString())
                .order('due_date', { ascending: true })
                .limit(3);

            if (assignmentsError) throw assignmentsError;

            this.renderUpcomingAssignments(assignments || []);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showError('Failed to load dashboard data');
        }
    }

    async loadStats() {
        try {
            // Count resources
            const { count: resourceCount } = await supabase
                .from('resources')
                .select('*', { count: 'exact', head: true })
                .eq('uploaded_by', this.user.id);

            document.getElementById('total-resources').textContent = resourceCount || 0;

            // Count pending assignments
            const { count: pendingCount } = await supabase
                .from('assignment_submissions')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', this.user.id)
                .is('submitted_at', null);

            document.getElementById('pending-assignments').textContent = pendingCount || 0;

            // Calculate average grade
            const { data: grades } = await supabase
                .from('assignment_submissions')
                .select('grade')
                .eq('student_id', this.user.id)
                .not('grade', 'is', null);

            if (grades && grades.length > 0) {
                const avg = grades.reduce((sum, g) => sum + g.grade, 0) / grades.length;
                document.getElementById('avg-grade').textContent = avg.toFixed(1);
            }

            // Study hours (placeholder)
            document.getElementById('study-hours').textContent = '42';

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    renderRecentResources(resources) {
        const container = document.getElementById('recent-resources');
        
        if (resources.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--gray-500);">No resources uploaded yet</p>';
            return;
        }

        container.innerHTML = resources.map(resource => `
            <div class="file-item" style="margin-bottom: var(--space-2); background: var(--gray-50);">
                <div class="file-info">
                    <div class="file-icon ${resource.type}">${this.getFileTypeIcon(resource.type)}</div>
                    <div class="file-details">
                        <h4>${resource.title}</h4>
                        <div class="file-meta">${resource.subject} • ${formatDate(resource.created_at)}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderUpcomingAssignments(assignments) {
        const container = document.getElementById('upcoming-assignments');
        
        if (assignments.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--gray-500);">No upcoming assignments</p>';
            return;
        }

        container.innerHTML = assignments.map(assignment => `
            <div class="assignment-card" style="margin-bottom: var(--space-2); padding: var(--space-3);">
                <div class="assignment-header">
                    <h4 class="assignment-title" style="font-size: 1rem;">${assignment.title}</h4>
                    <span class="assignment-status status-pending">${this.getAssignmentStatus(assignment)}</span>
                </div>
                <div class="assignment-meta">
                    <span>📅 Due: ${formatDate(assignment.due_date)}</span>
                </div>
            </div>
        `).join('');
    }

    getFileTypeIcon(type) {
        const icons = {
            notes: '📄',
            code: '💻',
            videos: '🎥',
            others: '📎'
        };
        return icons[type] || '📎';
    }

    getAssignmentStatus(assignment) {
        const now = new Date();
        const dueDate = new Date(assignment.due_date);
        
        if (now > dueDate) return 'Overdue';
        
        const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 1) return 'Due Soon';
        
        return 'Pending';
    }

    setupEventListeners() {
        // Quick action buttons
        document.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                if (page && this.pages && this.pages[page]) {
                    this.navigateToPage(page);
                }
            });
        });
    }

    cleanup() {
        // Clean up any timers or listeners
    }
}

export { StudentDashboard };