import { supabase, uploadFile, getFileUrl } from '../supabase-client.js';
import { showError, showSuccess, formatDate, getFileIcon, openModal, closeModal } from '../utils.js';

export class ResourcesPage {
    constructor(user, profile) {
        this.user = user;
        this.profile = profile;
        this.currentSubject = 'all';
        this.currentChapter = 'all';
        this.currentType = 'all';
        this.resources = [];
    }

    async render() {
        const pageContent = document.getElementById('page-content');
        
        pageContent.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Study Resources</h1>
                <p class="page-subtitle">Upload and browse learning materials</p>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3 class="card-title">Upload New Resource</h3>
                </div>
                <div class="card-body">
                    <div class="file-upload" id="file-upload-area">
                        <div class="file-upload-icon">📁</div>
                        <div class="file-upload-text">
                            <strong>Drop files here</strong> or click to select
                        </div>
                        <input type="file" id="file-input" class="file-input" multiple accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp4,.mov,.zip">
                    </div>
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3 class="card-title">Filter Resources</h3>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="filter-subject">Subject</label>
                            <select id="filter-subject">
                                <option value="all">All Subjects</option>
                                <option value="mathematics">Mathematics</option>
                                <option value="physics">Physics</option>
                                <option value="chemistry">Chemistry</option>
                                <option value="biology">Biology</option>
                                <option value="computer-science">Computer Science</option>
                                <option value="history">History</option>
                                <option value="literature">Literature</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="filter-chapter">Chapter</label>
                            <select id="filter-chapter">
                                <option value="all">All Chapters</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="filter-type">Type</label>
                            <select id="filter-type">
                                <option value="all">All Types</option>
                                <option value="notes">Notes</option>
                                <option value="code">Code</option>
                                <option value="videos">Videos</option>
                                <option value="others">Others</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Your Resources</h3>
                    <div class="search-box" style="max-width: 300px;">
                        <span class="search-icon">🔍</span>
                        <input type="text" id="search-resources" class="search-input" placeholder="Search resources...">
                    </div>
                </div>
                <div class="card-body">
                    <div id="resources-list">
                        <p class="text-center">Loading...</p>
                    </div>
                </div>
            </div>
        `;

        await this.loadResources();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // File upload
        const fileInput = document.getElementById('file-input');
        const uploadArea = document.getElementById('file-upload-area');

        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            this.handleFileUpload(files);
        });

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFileUpload(files);
        });

        // Filters
        document.getElementById('filter-subject').addEventListener('change', (e) => {
            this.currentSubject = e.target.value;
            this.updateChapterOptions();
            this.filterResources();
        });

        document.getElementById('filter-chapter').addEventListener('change', (e) => {
            this.currentChapter = e.target.value;
            this.filterResources();
        });

        document.getElementById('filter-type').addEventListener('change', (e) => {
            this.currentType = e.target.value;
            this.filterResources();
        });

        // Search
        document.getElementById('search-resources').addEventListener('input', (e) => {
            this.searchResources(e.target.value);
        });
    }

    async handleFileUpload(files) {
        if (files.length === 0) return;

        for (const file of files) {
            try {
                await this.uploadSingleFile(file);
            } catch (error) {
                showError(`Failed to upload ${file.name}: ${error.message}`);
            }
        }
    }

    async uploadSingleFile(file) {
        // Open metadata modal
        const modalContent = `
            <form id="resource-metadata-form">
                <input type="hidden" id="file-data" value="${file.name}">
                
                <div class="form-group">
                    <label for="resource-title">Title</label>
                    <input type="text" id="resource-title" value="${file.name}" required>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="resource-subject">Subject</label>
                        <select id="resource-subject" required>
                            <option value="">Select subject...</option>
                            <option value="mathematics">Mathematics</option>
                            <option value="physics">Physics</option>
                            <option value="chemistry">Chemistry</option>
                            <option value="biology">Biology</option>
                            <option value="computer-science">Computer Science</option>
                            <option value="history">History</option>
                            <option value="literature">Literature</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="resource-chapter">Chapter</label>
                        <input type="text" id="resource-chapter" placeholder="e.g., Chapter 1, Introduction" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="resource-type">Type</label>
                    <select id="resource-type" required>
                        <option value="">Select type...</option>
                        <option value="notes">Notes</option>
                        <option value="code">Code</option>
                        <option value="videos">Videos</option>
                        <option value="others">Others</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="resource-description">Description (Optional)</label>
                    <textarea id="resource-description" rows="3" placeholder="Brief description of the resource..."></textarea>
                </div>
                
                <button type="submit" class="btn btn-primary">Upload Resource</button>
            </form>
        `;

        openModal('Upload Resource', modalContent);

        // Store file reference for upload
        this.pendingFile = file;

        document.getElementById('resource-metadata-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitResourceUpload();
        });
    }

    async submitResourceUpload() {
        try {
            const title = document.getElementById('resource-title').value;
            const subject = document.getElementById('resource-subject').value;
            const chapter = document.getElementById('resource-chapter').value;
            const type = document.getElementById('resource-type').value;
            const description = document.getElementById('resource-description').value;

            // Upload file to Supabase Storage
            const fileName = `${Date.now()}_${this.pendingFile.name}`;
            const filePath = `resources/${this.user.id}/${fileName}`;
            
            await uploadFile('resources', filePath, this.pendingFile);

            // Save resource metadata to database
            const { error } = await supabase
                .from('resources')
                .insert([{
                    title,
                    subject,
                    chapter,
                    type,
                    description,
                    file_path: filePath,
                    file_name: this.pendingFile.name,
                    file_size: this.pendingFile.size,
                    uploaded_by: this.user.id
                }]);

            if (error) throw error;

            closeModal();
            showSuccess('Resource uploaded successfully!');
            await this.loadResources();

        } catch (error) {
            showError(error.message);
        }
    }

    async loadResources() {
        try {
            const { data: resources, error } = await supabase
                .from('resources')
                .select(`
                    *,
                    profiles!inner(full_name),
                    resource_ratings(rating),
                    resource_comments(count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.resources = resources || [];
            this.renderResources(this.resources);
        } catch (error) {
            console.error('Error loading resources:', error);
            showError('Failed to load resources');
        }
    }

    renderResources(resources) {
        const container = document.getElementById('resources-list');
        
        if (resources.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--gray-500);">No resources found</p>';
            return;
        }

        container.innerHTML = `
            <div class="file-list">
                ${resources.map(resource => this.renderResourceCard(resource)).join('')}
            </div>
        `;

        this.setupResourceEventListeners();
    }

    renderResourceCard(resource) {
        const avgRating = this.calculateAverageRating(resource.resource_ratings);
        const commentCount = resource.resource_comments?.length || 0;
        const fileIcon = getFileIcon(resource.file_name);
        const canEdit = resource.uploaded_by === this.user.id;

        return `
            <div class="file-item" data-resource-id="${resource.id}">
                <div class="file-info">
                    <div class="file-icon ${fileIcon}">${this.getFileTypeIcon(resource.type)}</div>
                    <div class="file-details">
                        <h4>${resource.title}</h4>
                        <div class="file-meta">
                            ${resource.subject} • ${resource.chapter} • ${resource.type}
                            <br>
                            by ${resource.profiles.full_name} • ${formatDate(resource.created_at)}
                        </div>
                        ${resource.description ? `<p style="margin-top: var(--space-1); font-size: 0.875rem; color: var(--gray-600);">${resource.description}</p>` : ''}
                        <div style="margin-top: var(--space-1); display: flex; align-items: center; gap: var(--space-2);">
                            <div class="rating-display">
                                ${this.renderStars(avgRating)}
                                <span style="font-size: 0.875rem; color: var(--gray-600);">(${resource.resource_ratings?.length || 0})</span>
                            </div>
                            <span style="font-size: 0.875rem; color: var(--gray-600);">💬 ${commentCount}</span>
                        </div>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-sm btn-primary download-btn" data-resource-id="${resource.id}">Download</button>
                    <button class="btn btn-sm btn-secondary view-details-btn" data-resource-id="${resource.id}">Details</button>
                    ${canEdit ? `<button class="btn btn-sm btn-accent edit-btn" data-resource-id="${resource.id}">Edit</button>` : ''}
                </div>
            </div>
        `;
    }

    calculateAverageRating(ratings) {
        if (!ratings || ratings.length === 0) return 0;
        const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
        return sum / ratings.length;
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars += '<span class="star filled">★</span>';
            } else if (i === fullStars && hasHalfStar) {
                stars += '<span class="star filled">★</span>';
            } else {
                stars += '<span class="star">☆</span>';
            }
        }

        return `<div class="rating">${stars}</div>`;
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

    setupResourceEventListeners() {
        // Download buttons
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const resourceId = e.target.dataset.resourceId;
                this.downloadResource(resourceId);
            });
        });

        // View details buttons
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const resourceId = e.target.dataset.resourceId;
                this.viewResourceDetails(resourceId);
            });
        });

        // Edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const resourceId = e.target.dataset.resourceId;
                this.editResource(resourceId);
            });
        });
    }

    async downloadResource(resourceId) {
        try {
            const resource = this.resources.find(r => r.id === parseInt(resourceId));
            if (!resource) return;

            const fileUrl = getFileUrl('resources', resource.file_path);
            
            // Create temporary download link
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = resource.file_name;
            link.click();

        } catch (error) {
            showError('Failed to download resource');
        }
    }

    async viewResourceDetails(resourceId) {
        const resource = this.resources.find(r => r.id === parseInt(resourceId));
        if (!resource) return;

        const modalContent = `
            <div class="resource-details">
                <div class="form-group">
                    <h4>${resource.title}</h4>
                    <p style="color: var(--gray-600);">${resource.description || 'No description available'}</p>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Subject</label>
                        <p>${resource.subject}</p>
                    </div>
                    <div class="form-group">
                        <label>Chapter</label>
                        <p>${resource.chapter}</p>
                    </div>
                    <div class="form-group">
                        <label>Type</label>
                        <p style="text-transform: capitalize;">${resource.type}</p>
                    </div>
                </div>

                <div class="form-group">
                    <label>Rate this resource</label>
                    <div class="rating" id="rating-input">
                        ${[1,2,3,4,5].map(i => `<span class="star" data-rating="${i}">☆</span>`).join('')}
                    </div>
                </div>

                <div class="form-group">
                    <label>Comments</label>
                    <div id="resource-comments">
                        <p style="color: var(--gray-500); text-align: center;">Loading comments...</p>
                    </div>
                    
                    <div style="margin-top: var(--space-3);">
                        <textarea id="new-comment" placeholder="Add a comment..." rows="3" style="width: 100%; margin-bottom: var(--space-2);"></textarea>
                        <button class="btn btn-primary" id="submit-comment">Add Comment</button>
                    </div>
                </div>

                <div class="form-group">
                    <label>Version History</label>
                    <div id="version-history">
                        <div class="file-item" style="background: var(--gray-50);">
                            <div class="file-info">
                                <div class="file-details">
                                    <h4>Version 1.0 (Current)</h4>
                                    <div class="file-meta">Uploaded ${formatDate(resource.created_at)}</div>
                                </div>
                            </div>
                            <button class="btn btn-sm btn-primary">Download</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        openModal(`Resource Details - ${resource.title}`, modalContent);
        await this.loadResourceComments(resourceId);
        this.setupResourceDetailsListeners(resourceId);
    }

    async loadResourceComments(resourceId) {
        try {
            const { data: comments, error } = await supabase
                .from('resource_comments')
                .select(`
                    *,
                    profiles!inner(full_name)
                `)
                .eq('resource_id', resourceId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const container = document.getElementById('resource-comments');
            
            if (comments.length === 0) {
                container.innerHTML = '<p style="color: var(--gray-500); text-align: center;">No comments yet</p>';
                return;
            }

            container.innerHTML = comments.map(comment => `
                <div class="comment" style="padding: var(--space-2); background: var(--gray-50); border-radius: var(--radius-md); margin-bottom: var(--space-2);">
                    <div style="font-weight: 500; color: var(--gray-800);">${comment.profiles.full_name}</div>
                    <div style="font-size: 0.875rem; color: var(--gray-600); margin-bottom: var(--space-1);">${formatDate(comment.created_at)}</div>
                    <p style="margin: 0;">${comment.comment}</p>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    setupResourceDetailsListeners(resourceId) {
        // Rating
        document.querySelectorAll('#rating-input .star').forEach(star => {
            star.addEventListener('click', async (e) => {
                const rating = parseInt(e.target.dataset.rating);
                await this.submitRating(resourceId, rating);
                
                // Update UI
                document.querySelectorAll('#rating-input .star').forEach((s, i) => {
                    s.textContent = i < rating ? '★' : '☆';
                    s.classList.toggle('filled', i < rating);
                });
            });
        });

        // Comment submission
        document.getElementById('submit-comment').addEventListener('click', async () => {
            const comment = document.getElementById('new-comment').value.trim();
            if (comment) {
                await this.submitComment(resourceId, comment);
                document.getElementById('new-comment').value = '';
                await this.loadResourceComments(resourceId);
            }
        });
    }

    async submitRating(resourceId, rating) {
        try {
            const { error } = await supabase
                .from('resource_ratings')
                .upsert([{
                    resource_id: resourceId,
                    user_id: this.user.id,
                    rating
                }]);

            if (error) throw error;
            showSuccess('Rating submitted!');
        } catch (error) {
            showError('Failed to submit rating');
        }
    }

    async submitComment(resourceId, comment) {
        try {
            const { error } = await supabase
                .from('resource_comments')
                .insert([{
                    resource_id: resourceId,
                    user_id: this.user.id,
                    comment
                }]);

            if (error) throw error;
            showSuccess('Comment added!');
        } catch (error) {
            showError('Failed to add comment');
        }
    }

    updateChapterOptions() {
        const chapterSelect = document.getElementById('filter-chapter');
        chapterSelect.innerHTML = '<option value="all">All Chapters</option>';
        
        // Get unique chapters for selected subject
        const filteredResources = this.currentSubject === 'all' 
            ? this.resources 
            : this.resources.filter(r => r.subject === this.currentSubject);
        
        const chapters = [...new Set(filteredResources.map(r => r.chapter))];
        chapters.forEach(chapter => {
            chapterSelect.innerHTML += `<option value="${chapter}">${chapter}</option>`;
        });
    }

    filterResources() {
        let filtered = this.resources;

        if (this.currentSubject !== 'all') {
            filtered = filtered.filter(r => r.subject === this.currentSubject);
        }

        if (this.currentChapter !== 'all') {
            filtered = filtered.filter(r => r.chapter === this.currentChapter);
        }

        if (this.currentType !== 'all') {
            filtered = filtered.filter(r => r.type === this.currentType);
        }

        this.renderResources(filtered);
    }

    searchResources(query) {
        if (!query.trim()) {
            this.filterResources();
            return;
        }

        const filtered = this.resources.filter(resource => 
            resource.title.toLowerCase().includes(query.toLowerCase()) ||
            resource.description?.toLowerCase().includes(query.toLowerCase()) ||
            resource.subject.toLowerCase().includes(query.toLowerCase()) ||
            resource.chapter.toLowerCase().includes(query.toLowerCase())
        );

        this.renderResources(filtered);
    }

    async editResource(resourceId) {
        const resource = this.resources.find(r => r.id === parseInt(resourceId));
        if (!resource) return;

        const modalContent = `
            <form id="edit-resource-form">
                <div class="form-group">
                    <label for="edit-resource-title">Title</label>
                    <input type="text" id="edit-resource-title" value="${resource.title}" required>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-resource-subject">Subject</label>
                        <select id="edit-resource-subject" required>
                            <option value="mathematics" ${resource.subject === 'mathematics' ? 'selected' : ''}>Mathematics</option>
                            <option value="physics" ${resource.subject === 'physics' ? 'selected' : ''}>Physics</option>
                            <option value="chemistry" ${resource.subject === 'chemistry' ? 'selected' : ''}>Chemistry</option>
                            <option value="biology" ${resource.subject === 'biology' ? 'selected' : ''}>Biology</option>
                            <option value="computer-science" ${resource.subject === 'computer-science' ? 'selected' : ''}>Computer Science</option>
                            <option value="history" ${resource.subject === 'history' ? 'selected' : ''}>History</option>
                            <option value="literature" ${resource.subject === 'literature' ? 'selected' : ''}>Literature</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="edit-resource-chapter">Chapter</label>
                        <input type="text" id="edit-resource-chapter" value="${resource.chapter}" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="edit-resource-type">Type</label>
                    <select id="edit-resource-type" required>
                        <option value="notes" ${resource.type === 'notes' ? 'selected' : ''}>Notes</option>
                        <option value="code" ${resource.type === 'code' ? 'selected' : ''}>Code</option>
                        <option value="videos" ${resource.type === 'videos' ? 'selected' : ''}>Videos</option>
                        <option value="others" ${resource.type === 'others' ? 'selected' : ''}>Others</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="edit-resource-description">Description</label>
                    <textarea id="edit-resource-description" rows="3">${resource.description || ''}</textarea>
                </div>
                
                <button type="submit" class="btn btn-primary">Update Resource</button>
            </form>
        `;

        openModal('Edit Resource', modalContent);

        document.getElementById('edit-resource-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleResourceUpdate(resourceId);
        });
    }

    async handleResourceUpdate(resourceId) {
        try {
            const updates = {
                title: document.getElementById('edit-resource-title').value,
                subject: document.getElementById('edit-resource-subject').value,
                chapter: document.getElementById('edit-resource-chapter').value,
                type: document.getElementById('edit-resource-type').value,
                description: document.getElementById('edit-resource-description').value
            };

            const { error } = await supabase
                .from('resources')
                .update(updates)
                .eq('id', resourceId);

            if (error) throw error;

            closeModal();
            showSuccess('Resource updated successfully!');
            await this.loadResources();
        } catch (error) {
            showError(error.message);
        }
    }

    cleanup() {
        // Clean up any active listeners or timers
    }
}