import { supabase } from '../supabase-client.js';
import { showError, showSuccess, formatDate, formatDateTime, openModal, closeModal } from '../utils.js';

export class GradingPage {
    constructor(user, profile) {
        this.user = user;
        this.profile = profile;
        this.submissions = [];
        this.currentFilter = 'pending';
    }

    async render() {
        const pageContent = document.getElementById('page-content');
        
        pageContent.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Grading Center</h1>
                <p class="page-subtitle">Review and grade student submissions</p>
            </div>

            <div class="stats-grid mb-4">
                <div class="stat-card">
                    <span class="stat-number" id="pending-grading">0</span>
                    <div class="stat-label">Pending Grading</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number" id="graded-this-week">0</span>
                    <div class="stat-label">Graded This Week</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number" id="total-submissions">0</span>
                    <div class="stat-label">Total Submissions</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number" id="avg-turnaround">0</span>
                    <div class="stat-label">Avg Turnaround (days)</div>
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3 class="card-title">Filter Submissions</h3>
                </div>
                <div class="card-body">
                    <div class="tabs">
                        <ul class="tab-list">
                            <li class="tab-item active" data-filter="pending">Pending Review</li>
                            <li class="tab-item" data-filter="graded">Graded</li>
                            <li class="tab-item" data-filter="all">All Submissions</li>
                            <li class="tab-item" data-filter="late">Late Submissions</li>
                        </ul>
                    </div>
                    
                    <div class="form-row mt-3">
                        <div class="form-group">
                            <label for="filter-class">Filter by Class</label>
                            <select id="filter-class">
                                <option value="all">All Classes</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="filter-assignment">Filter by Assignment</label>
                            <select id="filter-assignment">
                                <option value="all">All Assignments</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="sort-by">Sort By</label>
                            <select id="sort-by">
                                <option value="submitted_at">Submission Date</option>
                                <option value="due_date">Due Date</option>
                                <option value="student_name">Student Name</option>
                                <option value="assignment_name">Assignment Name</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Student Submissions</h3>
                    <div class="search-box" style="max-width: 300px;">
                        <span class="search-icon">🔍</span>
                        <input type="text" id="search-submissions" class="search-input" placeholder="Search submissions...">
                    </div>
                </div>
                <div class="card-body">
                    <div id="submissions-list">
                        <p class="text-center">Loading...</p>
                    </div>
                </div>
            </div>
        `;

        await this.loadSubmissions();
        await this.loadFilterOptions();
        this.setupEventListeners();
    }

    async loadSubmissions() {
        try {
            const { data: submissions, error } = await supabase
                .from('assignment_submissions')
                .select(`
                    *,
                    assignments!inner(
                        title,
                        due_date,
                        points,
                        teacher_id,
                        classes!inner(name)
                    ),
                    profiles!inner(full_name)
                `)
                .eq('assignments.teacher_id', this.user.id)
                .order('submitted_at', { ascending: false });

            if (error) throw error;

            this.submissions = submissions || [];
            this.renderSubmissions();
            this.updateStats();
        } catch (error) {
            console.error('Error loading submissions:', error);
            showError('Failed to load submissions');
        }
    }

    async loadFilterOptions() {
        try {
            // Load classes
            const { data: classes, error: classError } = await supabase
                .from('classes')
                .select('id, name')
                .eq('teacher_id', this.user.id);

            if (classError) throw classError;

            const classSelect = document.getElementById('filter-class');
            classSelect.innerHTML = '<option value="all">All Classes</option>' +
                classes.map(cls => `<option value="${cls.id}">${cls.name}</option>`).join('');

            // Load assignments
            const { data: assignments, error: assignmentError } = await supabase
                .from('assignments')
                .select('id, title')
                .eq('teacher_id', this.user.id);

            if (assignmentError) throw assignmentError;

            const assignmentSelect = document.getElementById('filter-assignment');
            assignmentSelect.innerHTML = '<option value="all">All Assignments</option>' +
                assignments.map(assignment => `<option value="${assignment.id}">${assignment.title}</option>`).join('');

        } catch (error) {
            console.error('Error loading filter options:', error);
        }
    }

    renderSubmissions() {
        const container = document.getElementById('submissions-list');
        const filteredSubmissions = this.getFilteredSubmissions();
        
        if (filteredSubmissions.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--gray-500);">No submissions found</p>';
            return;
        }

        container.innerHTML = `
            <div class="submissions-grid">
                ${filteredSubmissions.map(submission => this.renderSubmissionCard(submission)).join('')}
            </div>
        `;

        this.setupSubmissionCardListeners();
    }

    renderSubmissionCard(submission) {
        const isLate = new Date(submission.submitted_at) > new Date(submission.assignments.due_date);
        const isGraded = submission.grade !== null;
        const statusClass = isGraded ? 'status-graded' : 'status-pending';
        const status = isGraded ? 'Graded' : 'Pending';

        return `
            <div class="submission-card ${isLate ? 'late-submission' : ''}" data-submission-id="${submission.id}">
                <div class="card" style="margin-bottom: var(--space-3);">
                    <div class="card-header">
                        <div>
                            <h4 style="margin: 0; color: var(--gray-800);">${submission.assignments.title}</h4>
                            <p style="margin: 0; color: var(--gray-600); font-size: 0.875rem;">${submission.profiles.full_name}</p>
                        </div>
                        <span class="assignment-status ${statusClass}">${status}</span>
                    </div>
                    
                    <div class="card-body">
                        <div class="submission-meta" style="margin-bottom: var(--space-2);">
                            <div style="display: flex; flex-wrap: wrap; gap: var(--space-3); font-size: 0.875rem; color: var(--gray-600);">
                                <span>📚 ${submission.assignments.classes.name}</span>
                                <span>📅 Submitted: ${formatDateTime(submission.submitted_at)}</span>
                                <span>⏰ Due: ${formatDateTime(submission.assignments.due_date)}</span>
                                <span>🎯 Points: ${submission.assignments.points}</span>
                                ${isLate ? '<span style="color: var(--error-500);">⚠️ Late</span>' : ''}
                            </div>
                        </div>

                        <div class="submission-preview" style="margin-bottom: var(--space-3);">
                            <div style="background: var(--gray-50); padding: var(--space-2); border-radius: var(--radius-md); font-size: 0.875rem;">
                                ${submission.submission_text ? 
                                    `<p style="margin: 0;">${submission.submission_text.substring(0, 150)}${submission.submission_text.length > 150 ? '...' : ''}</p>` :
                                    '<p style="margin: 0; color: var(--gray-500);">No text submission</p>'
                                }
                            </div>
                            ${submission.file_path ? `
                                <div style="margin-top: var(--space-2);">
                                    <span style="font-size: 0.875rem; color: var(--gray-600);">📎 File attached</span>
                                </div>
                            ` : ''}
                        </div>

                        ${isGraded ? `
                            <div class="grade-display" style="background: var(--accent-50); padding: var(--space-2); border-radius: var(--radius-md); margin-bottom: var(--space-2);">
                                <div style="text-align: center;">
                                    <span style="font-size: 1.5rem; font-weight: 600; color: var(--accent-600);">${submission.grade}/${submission.assignments.points}</span>
                                    <div style="font-size: 0.875rem; color: var(--accent-700);">
                                        ${((submission.grade / submission.assignments.points) * 100).toFixed(1)}% 
                                        (${this.getGradeLetter((submission.grade / submission.assignments.points) * 100)})
                                    </div>
                                </div>
                                ${submission.feedback ? `
                                    <div style="margin-top: var(--space-2); font-size: 0.875rem;">
                                        <strong>Feedback:</strong> ${submission.feedback.substring(0, 100)}${submission.feedback.length > 100 ? '...' : ''}
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="card-footer">
                        <span style="font-size: 0.875rem; color: var(--gray-500);">
                            ${isGraded ? `Graded ${formatDate(submission.graded_at)}` : 'Awaiting review'}
                        </span>
                        <div>
                            <button class="btn btn-sm btn-primary view-submission-btn" data-submission-id="${submission.id}">
                                ${isGraded ? 'Review Grade' : 'Grade Now'}
                            </button>
                            ${submission.file_path ? `
                                <button class="btn btn-sm btn-secondary download-submission-btn" data-submission-id="${submission.id}">Download</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getFilteredSubmissions() {
        let filtered = [...this.submissions];

        // Filter by status
        switch (this.currentFilter) {
            case 'pending':
                filtered = filtered.filter(s => s.grade === null);
                break;
            case 'graded':
                filtered = filtered.filter(s => s.grade !== null);
                break;
            case 'late':
                filtered = filtered.filter(s => new Date(s.submitted_at) > new Date(s.assignments.due_date));
                break;
            // 'all' shows everything
        }

        // Apply other filters
        const classFilter = document.getElementById('filter-class')?.value;
        if (classFilter && classFilter !== 'all') {
            // This would need to be implemented based on class relationship
        }

        const assignmentFilter = document.getElementById('filter-assignment')?.value;
        if (assignmentFilter && assignmentFilter !== 'all') {
            filtered = filtered.filter(s => s.assignment_id === assignmentFilter);
        }

        // Sort
        const sortBy = document.getElementById('sort-by')?.value || 'submitted_at';
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'student_name':
                    return a.profiles.full_name.localeCompare(b.profiles.full_name);
                case 'assignment_name':
                    return a.assignments.title.localeCompare(b.assignments.title);
                case 'due_date':
                    return new Date(a.assignments.due_date) - new Date(b.assignments.due_date);
                default:
                    return new Date(b.submitted_at) - new Date(a.submitted_at);
            }
        });

        return filtered;
    }

    updateStats() {
        const pending = this.submissions.filter(s => s.grade === null).length;
        const total = this.submissions.length;
        
        // Calculate graded this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const gradedThisWeek = this.submissions.filter(s => 
            s.graded_at && new Date(s.graded_at) >= weekAgo
        ).length;

        // Calculate average turnaround time
        const gradedSubmissions = this.submissions.filter(s => s.graded_at);
        const avgTurnaround = gradedSubmissions.length > 0 ? 
            gradedSubmissions.reduce((sum, s) => {
                const submitted = new Date(s.submitted_at);
                const graded = new Date(s.graded_at);
                return sum + Math.ceil((graded - submitted) / (1000 * 60 * 60 * 24));
            }, 0) / gradedSubmissions.length : 0;

        document.getElementById('pending-grading').textContent = pending;
        document.getElementById('graded-this-week').textContent = gradedThisWeek;
        document.getElementById('total-submissions').textContent = total;
        document.getElementById('avg-turnaround').textContent = Math.round(avgTurnaround);
    }

    setupEventListeners() {
        // Filter tabs
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderSubmissions();
            });
        });

        // Filter dropdowns
        document.getElementById('filter-class').addEventListener('change', () => {
            this.renderSubmissions();
        });

        document.getElementById('filter-assignment').addEventListener('change', () => {
            this.renderSubmissions();
        });

        document.getElementById('sort-by').addEventListener('change', () => {
            this.renderSubmissions();
        });

        // Search
        document.getElementById('search-submissions').addEventListener('input', (e) => {
            this.searchSubmissions(e.target.value);
        });
    }

    setupSubmissionCardListeners() {
        // View/Grade submission buttons
        document.querySelectorAll('.view-submission-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const submissionId = e.target.dataset.submissionId;
                this.openGradingModal(submissionId);
            });
        });

        // Download buttons
        document.querySelectorAll('.download-submission-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const submissionId = e.target.dataset.submissionId;
                this.downloadSubmission(submissionId);
            });
        });
    }

    openGradingModal(submissionId) {
        const submission = this.submissions.find(s => s.id === submissionId);
        if (!submission) return;

        const isGraded = submission.grade !== null;
        const maxPoints = submission.assignments.points;

        const modalContent = `
            <div class="grading-modal">
                <div class="form-group">
                    <h4>${submission.assignments.title}</h4>
                    <div style="color: var(--gray-600); margin-bottom: var(--space-2);">
                        Student: ${submission.profiles.full_name} • 
                        Class: ${submission.assignments.classes.name} • 
                        ${new Date(submission.submitted_at) > new Date(submission.assignments.due_date) ? 
                            '<span style="color: var(--error-500);">Late Submission</span>' : 
                            'On Time'
                        }
                    </div>
                </div>

                <div class="form-group">
                    <label>Student Submission</label>
                    <div style="background: var(--gray-50); padding: var(--space-3); border-radius: var(--radius-md); max-height: 300px; overflow-y: auto;">
                        <div style="white-space: pre-line; line-height: 1.6;">
                            ${submission.submission_text || 'No text submission provided'}
                        </div>
                        ${submission.file_path ? `
                            <div style="margin-top: var(--space-2); padding-top: var(--space-2); border-top: 1px solid var(--gray-200);">
                                <div class="file-item" style="background: white;">
                                    <div class="file-info">
                                        <div class="file-icon pdf">📎</div>
                                        <div class="file-details">
                                            <h4>Attached File</h4>
                                            <div class="file-meta">Click to download</div>
                                        </div>
                                    </div>
                                    <button class="btn btn-sm btn-primary download-file-btn" data-path="${submission.file_path}">Download</button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="submission-grade">Grade (out of ${maxPoints})</label>
                        <input type="number" id="submission-grade" min="0" max="${maxPoints}" 
                               value="${submission.grade || ''}" placeholder="Enter grade...">
                    </div>
                    <div class="form-group">
                        <label>Grade Percentage</label>
                        <div id="grade-percentage" style="padding: var(--space-2); background: var(--gray-100); border-radius: var(--radius-md); text-align: center; font-weight: 600;">
                            ${submission.grade ? `${((submission.grade / maxPoints) * 100).toFixed(1)}% (${this.getGradeLetter((submission.grade / maxPoints) * 100)})` : '--'}
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="submission-feedback">Feedback for Student</label>
                    <textarea id="submission-feedback" rows="4" placeholder="Provide constructive feedback...">${submission.feedback || ''}</textarea>
                </div>

                <div class="form-group">
                    <label>Quick Feedback Templates</label>
                    <div style="display: flex; flex-wrap: wrap; gap: var(--space-1); margin-bottom: var(--space-2);">
                        <button class="btn btn-sm btn-secondary quick-feedback-btn" data-feedback="Excellent work! You demonstrated a clear understanding of the concepts.">Excellent</button>
                        <button class="btn btn-sm btn-secondary quick-feedback-btn" data-feedback="Good effort! Consider reviewing the key concepts for better understanding.">Good Effort</button>
                        <button class="btn btn-sm btn-secondary quick-feedback-btn" data-feedback="Please review the assignment requirements and resubmit if possible.">Needs Revision</button>
                        <button class="btn btn-sm btn-secondary quick-feedback-btn" data-feedback="Great improvement from your previous work! Keep it up.">Improvement</button>
                    </div>
                </div>

                ${isGraded ? `
                    <div class="alert alert-info">
                        <strong>Previously graded:</strong> ${formatDateTime(submission.graded_at)}
                    </div>
                ` : ''}

                <div style="display: flex; justify-content: space-between; margin-top: var(--space-4);">
                    <button class="btn btn-secondary" id="close-grading">Cancel</button>
                    <div>
                        <button class="btn btn-accent" id="save-draft-grade">Save Draft</button>
                        <button class="btn btn-primary" id="submit-grade">${isGraded ? 'Update Grade' : 'Submit Grade'}</button>
                    </div>
                </div>
            </div>
        `;

        openModal('Grade Submission', modalContent);

        // Update grade percentage as user types
        document.getElementById('submission-grade').addEventListener('input', (e) => {
            const grade = parseFloat(e.target.value);
            const percentageDiv = document.getElementById('grade-percentage');
            
            if (grade && grade <= maxPoints) {
                const percentage = ((grade / maxPoints) * 100).toFixed(1);
                const letter = this.getGradeLetter(percentage);
                percentageDiv.textContent = `${percentage}% (${letter})`;
                percentageDiv.style.color = this.getGradeColor(percentage);
            } else {
                percentageDiv.textContent = '--';
                percentageDiv.style.color = 'var(--gray-600)';
            }
        });

        // Quick feedback buttons
        document.querySelectorAll('.quick-feedback-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const feedback = e.target.dataset.feedback;
                const currentFeedback = document.getElementById('submission-feedback').value;
                const newFeedback = currentFeedback ? `${currentFeedback}\n\n${feedback}` : feedback;
                document.getElementById('submission-feedback').value = newFeedback;
            });
        });

        document.getElementById('close-grading').addEventListener('click', closeModal);

        document.getElementById('submit-grade').addEventListener('click', () => {
            this.handleSubmitGrade(submissionId);
        });

        // Download file button
        document.querySelector('.download-file-btn')?.addEventListener('click', (e) => {
            this.downloadFile(e.target.dataset.path);
        });
    }

    async handleSubmitGrade(submissionId) {
        try {
            const grade = document.getElementById('submission-grade').value;
            const feedback = document.getElementById('submission-feedback').value;

            if (!grade || grade === '') {
                showError('Please enter a grade');
                return;
            }

            const updates = {
                grade: parseInt(grade),
                feedback: feedback.trim(),
                graded_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('assignment_submissions')
                .update(updates)
                .eq('id', submissionId);

            if (error) throw error;

            closeModal();
            showSuccess('Grade submitted successfully!');
            await this.loadSubmissions();
        } catch (error) {
            showError(error.message);
        }
    }

    getGradeLetter(percentage) {
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 70) return 'C';
        if (percentage >= 60) return 'D';
        return 'F';
    }

    getGradeColor(percentage) {
        if (percentage >= 90) return 'var(--success-500)';
        if (percentage >= 80) return 'var(--accent-500)';
        if (percentage >= 70) return 'var(--warning-500)';
        if (percentage >= 60) return 'var(--secondary-500)';
        return 'var(--error-500)';
    }

    async downloadSubmission(submissionId) {
        const submission = this.submissions.find(s => s.id === submissionId);
        if (!submission || !submission.file_path) return;

        try {
            // In a real implementation, you would download from Supabase Storage
            showSuccess('Download started...');
        } catch (error) {
            showError('Failed to download submission');
        }
    }

    downloadFile(filePath) {
        // Implementation for downloading individual files
        showSuccess('File download started...');
    }

    searchSubmissions(query) {
        if (!query.trim()) {
            this.renderSubmissions();
            return;
        }

        // This would implement search functionality
        console.log('Searching submissions:', query);
    }

    cleanup() {
        // Clean up any listeners or timers
    }
}