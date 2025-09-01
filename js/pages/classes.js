import { supabase } from '../supabase-client.js';
import { showError, showSuccess, formatDate, openModal, closeModal } from '../utils.js';

export class ClassesPage {
    constructor(user, profile) {
        this.user = user;
        this.profile = profile;
        this.classes = [];
    }

    async render() {
        const pageContent = document.getElementById('page-content');
        
        pageContent.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Class Management</h1>
                <p class="page-subtitle">Manage your classes and students</p>
            </div>

            <div class="stats-grid mb-4">
                <div class="stat-card">
                    <span class="stat-number" id="total-classes">0</span>
                    <div class="stat-label">Total Classes</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number" id="total-students">0</span>
                    <div class="stat-label">Total Students</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number" id="active-assignments">0</span>
                    <div class="stat-label">Active Assignments</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number" id="avg-class-size">0</span>
                    <div class="stat-label">Avg Class Size</div>
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3 class="card-title">Create New Class</h3>
                    <button class="btn btn-primary" id="create-class-btn">Create Class</button>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Your Classes</h3>
                    <div class="search-box" style="max-width: 300px;">
                        <span class="search-icon">🔍</span>
                        <input type="text" id="search-classes" class="search-input" placeholder="Search classes...">
                    </div>
                </div>
                <div class="card-body">
                    <div id="classes-list">
                        <p class="text-center">Loading...</p>
                    </div>
                </div>
            </div>
        `;

        await this.loadClasses();
        this.setupEventListeners();
    }

    async loadClasses() {
        try {
            const { data: classes, error } = await supabase
                .from('classes')
                .select(`
                    *,
                    class_students(
                        id,
                        joined_at,
                        profiles!inner(full_name, role)
                    ),
                    assignments(
                        id,
                        title,
                        due_date
                    )
                `)
                .eq('teacher_id', this.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.classes = classes || [];
            this.renderClasses();
            this.updateStats();
        } catch (error) {
            console.error('Error loading classes:', error);
            showError('Failed to load classes');
        }
    }

    renderClasses() {
        const container = document.getElementById('classes-list');
        
        if (this.classes.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--gray-500);">No classes created yet</p>';
            return;
        }

        container.innerHTML = `
            <div class="grid grid-cols-1">
                ${this.classes.map(cls => this.renderClassCard(cls)).join('')}
            </div>
        `;

        this.setupClassCardListeners();
    }

    renderClassCard(cls) {
        const studentCount = cls.class_students?.length || 0;
        const assignmentCount = cls.assignments?.length || 0;
        const activeAssignments = cls.assignments?.filter(a => new Date(a.due_date) > new Date()).length || 0;

        return `
            <div class="card class-card" data-class-id="${cls.id}" style="margin-bottom: var(--space-4);">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">${cls.name}</h3>
                        <p class="card-subtitle">${cls.subject}</p>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-secondary class-menu-btn" data-class-id="${cls.id}">⋮</button>
                        <div class="dropdown-content">
                            <a href="#" class="dropdown-item edit-class-btn" data-class-id="${cls.id}">Edit Class</a>
                            <a href="#" class="dropdown-item manage-students-btn" data-class-id="${cls.id}">Manage Students</a>
                            <a href="#" class="dropdown-item view-assignments-btn" data-class-id="${cls.id}">View Assignments</a>
                            <a href="#" class="dropdown-item class-analytics-btn" data-class-id="${cls.id}">Analytics</a>
                        </div>
                    </div>
                </div>
                
                <div class="card-body">
                    <p style="color: var(--gray-600); margin-bottom: var(--space-3);">
                        ${cls.description || 'No description provided'}
                    </p>
                    
                    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: var(--space-3);">
                        <div class="text-center">
                            <span class="stat-number" style="font-size: 1.5rem;">${studentCount}</span>
                            <div class="stat-label">Students</div>
                        </div>
                        <div class="text-center">
                            <span class="stat-number" style="font-size: 1.5rem;">${assignmentCount}</span>
                            <div class="stat-label">Total Assignments</div>
                        </div>
                        <div class="text-center">
                            <span class="stat-number" style="font-size: 1.5rem;">${activeAssignments}</span>
                            <div class="stat-label">Active</div>
                        </div>
                    </div>

                    ${studentCount > 0 ? `
                        <div class="form-group">
                            <label style="font-size: 0.875rem; font-weight: 500;">Recent Students</label>
                            <div style="display: flex; flex-wrap: wrap; gap: var(--space-1); margin-top: var(--space-1);">
                                ${cls.class_students.slice(0, 5).map(student => `
                                    <div class="tag tag-secondary">${student.profiles.full_name}</div>
                                `).join('')}
                                ${studentCount > 5 ? `<div class="tag">+${studentCount - 5} more</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="card-footer">
                    <span style="font-size: 0.875rem; color: var(--gray-600);">
                        Created ${formatDate(cls.created_at)}
                    </span>
                    <div>
                        <button class="btn btn-sm btn-primary view-class-btn" data-class-id="${cls.id}">View Details</button>
                        <button class="btn btn-sm btn-accent add-students-btn" data-class-id="${cls.id}">Add Students</button>
                    </div>
                </div>
            </div>
        `;
    }

    updateStats() {
        const totalClasses = this.classes.length;
        const totalStudents = this.classes.reduce((sum, cls) => sum + (cls.class_students?.length || 0), 0);
        const totalAssignments = this.classes.reduce((sum, cls) => sum + (cls.assignments?.length || 0), 0);
        const activeAssignments = this.classes.reduce((sum, cls) => 
            sum + (cls.assignments?.filter(a => new Date(a.due_date) > new Date()).length || 0), 0);
        const avgClassSize = totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0;

        document.getElementById('total-classes').textContent = totalClasses;
        document.getElementById('total-students').textContent = totalStudents;
        document.getElementById('active-assignments').textContent = activeAssignments;
        document.getElementById('avg-class-size').textContent = avgClassSize;
    }

    setupEventListeners() {
        document.getElementById('create-class-btn').addEventListener('click', () => {
            this.openCreateClassModal();
        });

        document.getElementById('search-classes').addEventListener('input', (e) => {
            this.searchClasses(e.target.value);
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown').forEach(dropdown => {
                    dropdown.classList.remove('active');
                });
            }
        });
    }

    setupClassCardListeners() {
        // Dropdown menus
        document.querySelectorAll('.class-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = e.target.closest('.dropdown');
                
                // Close all other dropdowns
                document.querySelectorAll('.dropdown').forEach(d => {
                    if (d !== dropdown) d.classList.remove('active');
                });
                
                dropdown.classList.toggle('active');
            });
        });

        // View class buttons
        document.querySelectorAll('.view-class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const classId = e.target.dataset.classId;
                this.viewClassDetails(classId);
            });
        });

        // Add students buttons
        document.querySelectorAll('.add-students-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const classId = e.target.dataset.classId;
                this.openAddStudentsModal(classId);
            });
        });

        // Edit class buttons
        document.querySelectorAll('.edit-class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const classId = e.target.dataset.classId;
                this.editClass(classId);
            });
        });

        // Manage students buttons
        document.querySelectorAll('.manage-students-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const classId = e.target.dataset.classId;
                this.manageStudents(classId);
            });
        });

        // View assignments buttons
        document.querySelectorAll('.view-assignments-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const classId = e.target.dataset.classId;
                this.viewClassAssignments(classId);
            });
        });

        // Class analytics buttons
        document.querySelectorAll('.class-analytics-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const classId = e.target.dataset.classId;
                this.viewClassAnalytics(classId);
            });
        });
    }

    openCreateClassModal() {
        const modalContent = `
            <form id="create-class-form">
                <div class="form-group">
                    <label for="class-name">Class Name</label>
                    <input type="text" id="class-name" required placeholder="e.g., Advanced Mathematics">
                </div>
                
                <div class="form-group">
                    <label for="class-subject">Subject</label>
                    <select id="class-subject" required>
                        <option value="">Select subject...</option>
                        <option value="mathematics">Mathematics</option>
                        <option value="physics">Physics</option>
                        <option value="chemistry">Chemistry</option>
                        <option value="biology">Biology</option>
                        <option value="computer-science">Computer Science</option>
                        <option value="history">History</option>
                        <option value="literature">Literature</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="class-description">Description</label>
                    <textarea id="class-description" rows="3" placeholder="Brief description of the class..."></textarea>
                </div>
                
                <div class="form-group">
                    <label for="class-code">Class Code (Optional)</label>
                    <input type="text" id="class-code" placeholder="Enter a custom class code or leave blank for auto-generation">
                    <div style="font-size: 0.875rem; color: var(--gray-600); margin-top: var(--space-1);">
                        Students will use this code to join your class
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary">Create Class</button>
            </form>
        `;

        openModal('Create New Class', modalContent);

        document.getElementById('create-class-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreateClass();
        });
    }

    async handleCreateClass() {
        try {
            let classCode = document.getElementById('class-code').value;
            
            // Generate random class code if none provided
            if (!classCode) {
                classCode = Math.random().toString(36).substr(2, 8).toUpperCase();
            }

            const classData = {
                name: document.getElementById('class-name').value,
                subject: document.getElementById('class-subject').value,
                description: document.getElementById('class-description').value,
                class_code: classCode,
                teacher_id: this.user.id
            };

            const { error } = await supabase
                .from('classes')
                .insert([classData]);

            if (error) throw error;

            closeModal();
            showSuccess(`Class created successfully! Class code: ${classCode}`);
            await this.loadClasses();
        } catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                showError('Class code already exists. Please choose a different one.');
            } else {
                showError(error.message);
            }
        }
    }

    viewClassDetails(classId) {
        const cls = this.classes.find(c => c.id === classId);
        if (!cls) return;

        const modalContent = `
            <div class="class-details">
                <div class="form-group">
                    <h4>${cls.name}</h4>
                    <p style="color: var(--gray-600);">${cls.subject} • Created ${formatDate(cls.created_at)}</p>
                    ${cls.description ? `<p style="margin-top: var(--space-2);">${cls.description}</p>` : ''}
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Class Code</label>
                        <div style="display: flex; align-items: center; gap: var(--space-2);">
                            <input type="text" value="${cls.class_code || 'N/A'}" readonly style="background: var(--gray-100);">
                            <button class="btn btn-sm btn-secondary copy-code-btn" data-code="${cls.class_code}">Copy</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Students Enrolled</label>
                        <input type="text" value="${cls.class_students?.length || 0}" readonly style="background: var(--gray-100);">
                    </div>
                </div>

                <div class="form-group">
                    <label>Recent Activity</label>
                    <div style="background: var(--gray-50); padding: var(--space-3); border-radius: var(--radius-md);">
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            ${cls.assignments?.slice(0, 3).map(assignment => `
                                <li style="margin-bottom: var(--space-1); font-size: 0.875rem;">
                                    📝 ${assignment.title} - Due ${formatDate(assignment.due_date)}
                                </li>
                            `).join('') || '<li style="color: var(--gray-500);">No recent activity</li>'}
                        </ul>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; margin-top: var(--space-4);">
                    <button class="btn btn-secondary" id="close-class-details">Close</button>
                    <div>
                        <button class="btn btn-accent manage-students-modal-btn" data-class-id="${cls.id}">Manage Students</button>
                        <button class="btn btn-primary edit-class-modal-btn" data-class-id="${cls.id}">Edit Class</button>
                    </div>
                </div>
            </div>
        `;

        openModal(`Class Details - ${cls.name}`, modalContent);

        document.getElementById('close-class-details').addEventListener('click', closeModal);

        // Copy class code
        document.querySelector('.copy-code-btn')?.addEventListener('click', (e) => {
            navigator.clipboard.writeText(e.target.dataset.code);
            showSuccess('Class code copied to clipboard!');
        });

        // Quick action buttons
        document.querySelector('.manage-students-modal-btn')?.addEventListener('click', (e) => {
            closeModal();
            this.manageStudents(e.target.dataset.classId);
        });

        document.querySelector('.edit-class-modal-btn')?.addEventListener('click', (e) => {
            closeModal();
            this.editClass(e.target.dataset.classId);
        });
    }

    openAddStudentsModal(classId) {
        const modalContent = `
            <div class="add-students-modal">
                <div class="form-group">
                    <h4>Add Students to Class</h4>
                    <p style="color: var(--gray-600);">Students can join using the class code, or you can invite them by email</p>
                </div>

                <div class="tabs">
                    <ul class="tab-list">
                        <li class="tab-item active" data-tab="class-code">Class Code</li>
                        <li class="tab-item" data-tab="email-invite">Email Invite</li>
                        <li class="tab-item" data-tab="bulk-add">Bulk Add</li>
                    </ul>
                </div>

                <div class="tab-content active" id="class-code-tab">
                    <div class="form-group">
                        <label>Share this code with your students:</label>
                        <div style="text-align: center; background: var(--primary-50); padding: var(--space-4); border-radius: var(--radius-lg); margin: var(--space-2) 0;">
                            <div style="font-size: 2rem; font-weight: 700; color: var(--primary-600); letter-spacing: 2px;">
                                ${this.classes.find(c => c.id === classId)?.class_code || 'N/A'}
                            </div>
                            <button class="btn btn-sm btn-primary" style="margin-top: var(--space-2);" id="copy-class-code">Copy Code</button>
                        </div>
                        <p style="font-size: 0.875rem; color: var(--gray-600); text-align: center;">
                            Students can use this code on their dashboard to join the class
                        </p>
                    </div>
                </div>

                <div class="tab-content" id="email-invite-tab">
                    <form id="email-invite-form">
                        <div class="form-group">
                            <label for="student-emails">Student Email Addresses</label>
                            <textarea id="student-emails" rows="4" placeholder="Enter email addresses, one per line or separated by commas"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="invite-message">Custom Message (Optional)</label>
                            <textarea id="invite-message" rows="3" placeholder="Add a personal message to the invitation..."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">Send Invitations</button>
                    </form>
                </div>

                <div class="tab-content" id="bulk-add-tab">
                    <div class="form-group">
                        <label>Upload Student List</label>
                        <div class="file-upload" style="margin-bottom: var(--space-2);">
                            <div class="file-upload-icon">📄</div>
                            <div class="file-upload-text">
                                <strong>Upload CSV file</strong> with student information
                            </div>
                            <input type="file" id="student-csv-file" class="file-input" accept=".csv">
                        </div>
                        <div style="font-size: 0.875rem; color: var(--gray-600);">
                            CSV format: Name, Email, Student ID (optional)
                        </div>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; margin-top: var(--space-4);">
                    <button class="btn btn-secondary" id="close-add-students">Close</button>
                </div>
            </div>
        `;

        openModal('Add Students', modalContent);

        // Tab switching
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                
                document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                e.target.classList.add('active');
                document.getElementById(`${tabName}-tab`).classList.add('active');
            });
        });

        // Copy class code
        document.getElementById('copy-class-code').addEventListener('click', () => {
            const code = this.classes.find(c => c.id === classId)?.class_code;
            navigator.clipboard.writeText(code);
            showSuccess('Class code copied to clipboard!');
        });

        document.getElementById('close-add-students').addEventListener('click', closeModal);
    }

    manageStudents(classId) {
        const cls = this.classes.find(c => c.id === classId);
        if (!cls) return;

        const students = cls.class_students || [];

        const modalContent = `
            <div class="manage-students">
                <div class="form-group">
                    <h4>Manage Students - ${cls.name}</h4>
                    <p style="color: var(--gray-600);">${students.length} students enrolled</p>
                </div>

                <div class="form-group">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
                        <label>Enrolled Students</label>
                        <button class="btn btn-sm btn-primary" id="add-more-students" data-class-id="${classId}">Add More Students</button>
                    </div>
                    
                    ${students.length > 0 ? `
                        <div style="max-height: 400px; overflow-y: auto;">
                            ${students.map(student => `
                                <div class="file-item" style="margin-bottom: var(--space-2);">
                                    <div class="file-info">
                                        <div class="file-icon" style="background-color: var(--accent-500);">👤</div>
                                        <div class="file-details">
                                            <h4>${student.profiles.full_name}</h4>
                                            <div class="file-meta">Joined ${formatDate(student.joined_at)}</div>
                                        </div>
                                    </div>
                                    <div class="file-actions">
                                        <button class="btn btn-sm btn-secondary view-student-btn" data-student-id="${student.id}">View Progress</button>
                                        <button class="btn btn-sm btn-accent remove-student-btn" data-student-id="${student.id}" data-student-name="${student.profiles.full_name}">Remove</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p style="text-align: center; color: var(--gray-500); padding: var(--space-4);">
                            No students enrolled yet. Share your class code to get started!
                        </p>
                    `}
                </div>

                <div style="display: flex; justify-content: flex-end; margin-top: var(--space-4);">
                    <button class="btn btn-secondary" id="close-manage-students">Close</button>
                </div>
            </div>
        `;

        openModal(`Manage Students - ${cls.name}`, modalContent);

        document.getElementById('close-manage-students').addEventListener('click', closeModal);

        document.getElementById('add-more-students')?.addEventListener('click', (e) => {
            closeModal();
            this.openAddStudentsModal(e.target.dataset.classId);
        });

        // Remove student buttons
        document.querySelectorAll('.remove-student-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const studentId = e.target.dataset.studentId;
                const studentName = e.target.dataset.studentName;
                
                if (confirm(`Are you sure you want to remove ${studentName} from this class?`)) {
                    await this.removeStudentFromClass(studentId);
                    closeModal();
                    this.manageStudents(classId); // Refresh the modal
                }
            });
        });
    }

    async removeStudentFromClass(enrollmentId) {
        try {
            const { error } = await supabase
                .from('class_students')
                .delete()
                .eq('id', enrollmentId);

            if (error) throw error;

            showSuccess('Student removed from class');
            await this.loadClasses(); // Refresh data
        } catch (error) {
            showError('Failed to remove student');
        }
    }

    editClass(classId) {
        const cls = this.classes.find(c => c.id === classId);
        if (!cls) return;

        const modalContent = `
            <form id="edit-class-form">
                <div class="form-group">
                    <label for="edit-class-name">Class Name</label>
                    <input type="text" id="edit-class-name" value="${cls.name}" required>
                </div>
                
                <div class="form-group">
                    <label for="edit-class-subject">Subject</label>
                    <select id="edit-class-subject" required>
                        <option value="mathematics" ${cls.subject === 'mathematics' ? 'selected' : ''}>Mathematics</option>
                        <option value="physics" ${cls.subject === 'physics' ? 'selected' : ''}>Physics</option>
                        <option value="chemistry" ${cls.subject === 'chemistry' ? 'selected' : ''}>Chemistry</option>
                        <option value="biology" ${cls.subject === 'biology' ? 'selected' : ''}>Biology</option>
                        <option value="computer-science" ${cls.subject === 'computer-science' ? 'selected' : ''}>Computer Science</option>
                        <option value="history" ${cls.subject === 'history' ? 'selected' : ''}>History</option>
                        <option value="literature" ${cls.subject === 'literature' ? 'selected' : ''}>Literature</option>
                        <option value="other" ${cls.subject === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="edit-class-description">Description</label>
                    <textarea id="edit-class-description" rows="3">${cls.description || ''}</textarea>
                </div>
                
                <button type="submit" class="btn btn-primary">Update Class</button>
            </form>
        `;

        openModal('Edit Class', modalContent);

        document.getElementById('edit-class-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEditClass(classId);
        });
    }

    async handleEditClass(classId) {
        try {
            const updates = {
                name: document.getElementById('edit-class-name').value,
                subject: document.getElementById('edit-class-subject').value,
                description: document.getElementById('edit-class-description').value,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('classes')
                .update(updates)
                .eq('id', classId);

            if (error) throw error;

            closeModal();
            showSuccess('Class updated successfully!');
            await this.loadClasses();
        } catch (error) {
            showError(error.message);
        }
    }

    viewClassAssignments(classId) {
        const cls = this.classes.find(c => c.id === classId);
        if (!cls) return;

        const assignments = cls.assignments || [];

        const modalContent = `
            <div class="class-assignments">
                <div class="form-group">
                    <h4>Assignments - ${cls.name}</h4>
                    <p style="color: var(--gray-600);">${assignments.length} assignments created</p>
                </div>

                <div class="form-group">
                    ${assignments.length > 0 ? `
                        <div style="max-height: 400px; overflow-y: auto;">
                            ${assignments.map(assignment => `
                                <div class="assignment-card" style="margin-bottom: var(--space-3); padding: var(--space-3);">
                                    <div class="assignment-header">
                                        <h4 class="assignment-title">${assignment.title}</h4>
                                        <span class="assignment-status ${new Date(assignment.due_date) > new Date() ? 'status-active' : 'status-closed'}">
                                            ${new Date(assignment.due_date) > new Date() ? 'Active' : 'Closed'}
                                        </span>
                                    </div>
                                    <div class="assignment-meta">
                                        <span>📅 Due: ${formatDate(assignment.due_date)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p style="text-align: center; color: var(--gray-500); padding: var(--space-4);">
                            No assignments created yet for this class.
                        </p>
                    `}
                </div>

                <div style="display: flex; justify-content: space-between; margin-top: var(--space-4);">
                    <button class="btn btn-secondary" id="close-assignments">Close</button>
                    <button class="btn btn-primary" id="create-assignment-for-class" data-class-id="${classId}">Create Assignment</button>
                </div>
            </div>
        `;

        openModal(`Class Assignments - ${cls.name}`, modalContent);

        document.getElementById('close-assignments').addEventListener('click', closeModal);
        
        document.getElementById('create-assignment-for-class')?.addEventListener('click', (e) => {
            closeModal();
            // This would open the assignment creation modal with this class pre-selected
            showSuccess('Navigate to Assignments page to create a new assignment for this class.');
        });
    }

    viewClassAnalytics(classId) {
        const cls = this.classes.find(c => c.id === classId);
        if (!cls) return;

        // Mock analytics data
        const modalContent = `
            <div class="class-analytics">
                <div class="form-group">
                    <h4>Class Analytics - ${cls.name}</h4>
                    <p style="color: var(--gray-600);">Performance insights and statistics</p>
                </div>

                <div class="stats-grid" style="margin-bottom: var(--space-4);">
                    <div class="stat-card">
                        <span class="stat-number" style="font-size: 2rem;">87%</span>
                        <div class="stat-label">Avg Assignment Completion</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number" style="font-size: 2rem;">B+</span>
                        <div class="stat-label">Average Grade</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number" style="font-size: 2rem;">23</span>
                        <div class="stat-label">Submissions This Week</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number" style="font-size: 2rem;">95%</span>
                        <div class="stat-label">Student Engagement</div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Recent Trends</label>
                    <div class="alert alert-info">
                        📈 Assignment completion rates have improved by 12% this month!
                    </div>
                    <div class="alert alert-success">
                        🎯 Students are most engaged with interactive content and peer discussions.
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; margin-top: var(--space-4);">
                    <button class="btn btn-secondary" id="close-analytics">Close</button>
                </div>
            </div>
        `;

        openModal(`Analytics - ${cls.name}`, modalContent);

        document.getElementById('close-analytics').addEventListener('click', closeModal);
    }

    searchClasses(query) {
        if (!query.trim()) {
            this.renderClasses();
            return;
        }

        const filtered = this.classes.filter(cls => 
            cls.name.toLowerCase().includes(query.toLowerCase()) ||
            cls.subject.toLowerCase().includes(query.toLowerCase()) ||
            cls.description?.toLowerCase().includes(query.toLowerCase())
        );

        const container = document.getElementById('classes-list');
        container.innerHTML = `
            <div class="grid grid-cols-1">
                ${filtered.map(cls => this.renderClassCard(cls)).join('')}
            </div>
        `;

        this.setupClassCardListeners();
    }

    cleanup() {
        // Clean up any listeners or timers
    }
}