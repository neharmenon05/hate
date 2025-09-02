import { supabase } from '../supabase-client.js';
import { formatDate, showError } from '../utils.js';

export class TeacherDashboard {
    constructor(user, profile) {
        this.user = user;
        this.profile = profile;
        this.data = {
            classes: [],
            recentSubmissions: [],
            stats: {}
        };
    }

    async render() {
        const pageContent = document.getElementById('page-content');
        
        pageContent.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Teacher Dashboard</h1>
                <p class="page-subtitle">Manage your classes and assignments</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-number" id="total-classes">0</span>
                    <div class="stat-label">Active Classes</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number" id="total-students">0</span>
                    <div class="stat-label">Total Students</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number" id="pending-grading">0</span>
                    <div class="stat-label">Pending Grading</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number" id="assignments-created">0</span>
                    <div class="stat-label">Assignments Created</div>
                </div>
            </div>

            <div class="grid grid-cols-2">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Your Classes</h3>
                        <button class="btn btn-sm btn-primary" id="create-class-btn">Create Class</button>
                    </div>
                    <div class="card-body">
                        <div id="teacher-classes">
                            <p class="text-center">Loading...</p>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Recent Submissions</h3>
                        <a href="#" class="btn btn-sm btn-primary" data-page="grading">View All</a>
                    </div>
                    <div class="card-body">
                        <div id="recent-submissions">
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
                            <button class="btn btn-primary" id="create-assignment-btn">Create Assignment</button>
                            <button class="btn btn-secondary" data-page="grading">Grade Submissions</button>
                            <button class="btn btn-accent" data-page="classes">Manage Classes</button>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Teaching Analytics</h3>
                    </div>
                    <div class="card-body">
                        <div class="text-center">
                            <span class="stat-number" style="font-size: 2rem;">95%</span>
                            <div class="stat-label">Assignment Completion Rate</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Class Performance</h3>
                    </div>
                    <div class="card-body">
                        <div class="text-center">
                            <span class="stat-number" style="font-size: 2rem;">B+</span>
                            <div class="stat-label">Average Class Grade</div>
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
            await this.loadStats();
            await this.loadClasses();
            await this.loadRecentSubmissions();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showError('Failed to load dashboard data');
        }
    }

    async loadStats() {
        try {
            // Count classes
            const { count: classCount } = await supabase
                .from('classes')
                .select('*', { count: 'exact', head: true })
                .eq('teacher_id', this.user.id);

            document.getElementById('total-classes').textContent = classCount || 0;

            // Count total students
            const { count: studentCount } = await supabase
                .from('class_students')
                .select('*', { count: 'exact', head: true })
                .eq('classes.teacher_id', this.user.id);

            document.getElementById('total-students').textContent = studentCount || 0;

            // Count pending submissions
            const { count: pendingCount } = await supabase
                .from('assignment_submissions')
                .select('*', { count: 'exact', head: true })
                .eq('assignments.teacher_id', this.user.id)
                .is('grade', null);

            document.getElementById('pending-grading').textContent = pendingCount || 0;

            // Count assignments created
            const { count: assignmentCount } = await supabase
                .from('assignments')
                .select('*', { count: 'exact', head: true })
                .eq('teacher_id', this.user.id);

            document.getElementById('assignments-created').textContent = assignmentCount || 0;

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadClasses() {
        try {
            const { data: classes, error } = await supabase
                .from('classes')
                .select(`
                    *,
                    class_students(count)
                `)
                .eq('teacher_id', this.user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            this.renderClasses(classes || []);
        } catch (error) {
            console.error('Error loading classes:', error);
        }
    }

    async loadRecentSubmissions() {
        try {
            const { data: submissions, error } = await supabase
                .from('assignment_submissions')
                .select(`
                    *,
                    assignments!inner(title, teacher_id),
                    profiles!inner(full_name)
                `)
                .eq('assignments.teacher_id', this.user.id)
                .order('submitted_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            this.renderRecentSubmissions(submissions || []);
        } catch (error) {
            console.error('Error loading submissions:', error);
        }
    }

    renderClasses(classes) {
        const container = document.getElementById('teacher-classes');
        
        if (classes.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--gray-500);">No classes created yet</p>';
            return;
        }

        container.innerHTML = classes.map(cls => `
            <div class="file-item" style="margin-bottom: var(--space-2); background: var(--gray-50);">
                <div class="file-info">
                    <div class="file-icon" style="background-color: var(--secondary-500);">👥</div>
                    <div class="file-details">
                        <h4>${cls.name}</h4>
                        <div class="file-meta">${cls.description || 'No description'}</div>
                    </div>
                </div>
                <div class="tag tag-primary">${cls.class_students?.length || 0} students</div>
            </div>
        `).join('');
    }

    renderRecentSubmissions(submissions) {
        const container = document.getElementById('recent-submissions');
        
        if (submissions.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--gray-500);">No recent submissions</p>';
            return;
        }

        container.innerHTML = submissions.map(submission => `
            <div class="file-item" style="margin-bottom: var(--space-2); background: var(--gray-50);">
                <div class="file-info">
                    <div class="file-icon" style="background-color: var(--accent-500);">📝</div>
                    <div class="file-details">
                        <h4>${submission.assignments.title}</h4>
                        <div class="file-meta">by ${submission.profiles.full_name} • ${formatDate(submission.submitted_at)}</div>
                    </div>
                </div>
                <div class="tag ${submission.grade ? 'tag-accent' : 'tag-primary'}">
                    ${submission.grade ? `Grade: ${submission.grade}` : 'Needs Grading'}
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Quick action buttons
        document.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // These will be handled by the main app navigation
            });
        });

        document.getElementById('create-class-btn')?.addEventListener('click', () => {
            this.openCreateClassModal();
        });

        document.getElementById('create-assignment-btn')?.addEventListener('click', () => {
            this.openCreateAssignmentModal();
        });
    }

    openCreateClassModal() {
        const modalContent = `
            <form id="create-class-form">
                <div class="form-group">
                    <label for="class-name">Class Name</label>
                    <input type="text" id="class-name" required>
                </div>
                <div class="form-group">
                    <label for="class-description">Description</label>
                    <textarea id="class-description" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="class-subject">Subject</label>
                    <input type="text" id="class-subject" required>
                </div>
                <button type="submit" class="btn btn-primary">Create Class</button>
            </form>
        `;

        openModal('Create New Class', modalContent);

        document.getElementById('create-class-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreateClass(e);
        });
    }

    openCreateAssignmentModal() {
        const modalContent = `
            <form id="create-assignment-form">
                <div class="form-group">
                    <label for="assignment-title">Assignment Title</label>
                    <input type="text" id="assignment-title" required>
                </div>
                <div class="form-group">
                    <label for="assignment-description">Description</label>
                    <textarea id="assignment-description" rows="4"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="assignment-class">Class</label>
                        <select id="assignment-class" required>
                            <option value="">Select class...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="assignment-due-date">Due Date</label>
                        <input type="datetime-local" id="assignment-due-date" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="assignment-points">Points</label>
                    <input type="number" id="assignment-points" min="1" value="100">
                </div>
                <button type="submit" class="btn btn-primary">Create Assignment</button>
            </form>
        `;

        openModal('Create New Assignment', modalContent);
        this.loadClassOptions();

        document.getElementById('create-assignment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreateAssignment(e);
        });
    }

    async loadClassOptions() {
        try {
            const { data: classes, error } = await supabase
                .from('classes')
                .select('id, name')
                .eq('teacher_id', this.user.id);

            if (error) throw error;

            const select = document.getElementById('assignment-class');
            select.innerHTML = '<option value="">Select class...</option>' +
                classes.map(cls => `<option value="${cls.id}">${cls.name}</option>`).join('');
        } catch (error) {
            console.error('Error loading classes:', error);
        }
    }

    async handleCreateClass(e) {
        try {
            const formData = new FormData(e.target);
            const classData = {
                name: document.getElementById('class-name').value,
                description: document.getElementById('class-description').value,
                subject: document.getElementById('class-subject').value,
                teacher_id: this.user.id
            };

            const { error } = await supabase
                .from('classes')
                .insert([classData]);

            if (error) throw error;

            closeModal();
            showSuccess('Class created successfully!');
            await this.loadDashboardData();
        } catch (error) {
            showError(error.message);
        }
    }

    async handleCreateAssignment(e) {
        try {
            const assignmentData = {
                title: document.getElementById('assignment-title').value,
                description: document.getElementById('assignment-description').value,
                class_id: document.getElementById('assignment-class').value,
                due_date: document.getElementById('assignment-due-date').value,
                points: parseInt(document.getElementById('assignment-points').value),
                teacher_id: this.user.id
            };

            const { error } = await supabase
                .from('assignments')
                .insert([assignmentData]);

            if (error) throw error;

            closeModal();
            showSuccess('Assignment created successfully!');
            await this.loadDashboardData();
        } catch (error) {
            showError(error.message);
        }
    }

    cleanup() {
        // Clean up any timers or listeners
    }
}