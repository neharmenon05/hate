import { supabase, uploadFile, downloadFile } from '../supabase-client.js';
import { showError, showSuccess, formatDate, openModal, closeModal } from '../utils.js';

export class AIAssistantPage {
    constructor(user, profile) {
        this.user = user;
        this.profile = profile;
        this.summaries = [];
    }

    async render() {
        const pageContent = document.getElementById('page-content');
        
        pageContent.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">AI Assistant</h1>
                <p class="page-subtitle">Upload documents to get summaries and personalized study plans</p>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3 class="card-title">Upload Document for Analysis</h3>
                </div>
                <div class="card-body">
                    <div class="file-upload" id="ai-file-upload">
                        <div class="file-upload-icon">🤖</div>
                        <div class="file-upload-text">
                            <strong>Drop a document here</strong> or click to select
                        </div>
                        <p style="font-size: 0.875rem; color: var(--gray-600); margin-top: var(--space-2);">
                            Supported formats: PDF, DOC, DOCX, TXT (Max 10MB)
                        </p>
                        <input type="file" id="ai-file-input" class="file-input" accept=".pdf,.doc,.docx,.txt">
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-3 mb-4">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Features</h3>
                    </div>
                    <div class="card-body">
                        <ul style="list-style: none; padding: 0;">
                            <li style="margin-bottom: var(--space-2); display: flex; align-items: center;">
                                <span style="margin-right: var(--space-2);">📝</span>
                                <span>Document Summarization</span>
                            </li>
                            <li style="margin-bottom: var(--space-2); display: flex; align-items: center;">
                                <span style="margin-right: var(--space-2);">📚</span>
                                <span>Study Plan Generation</span>
                            </li>
                            <li style="margin-bottom: var(--space-2); display: flex; align-items: center;">
                                <span style="margin-right: var(--space-2);">🎯</span>
                                <span>Key Points Extraction</span>
                            </li>
                            <li style="margin-bottom: var(--space-2); display: flex; align-items: center;">
                                <span style="margin-right: var(--space-2);">❓</span>
                                <span>Question Generation</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">How It Works</h3>
                    </div>
                    <div class="card-body">
                        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                            <div style="display: flex; align-items: center; gap: var(--space-2);">
                                <div style="background: var(--primary-500); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600;">1</div>
                                <span style="font-size: 0.875rem;">Upload your document</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: var(--space-2);">
                                <div style="background: var(--primary-500); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600;">2</div>
                                <span style="font-size: 0.875rem;">AI analyzes the content</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: var(--space-2);">
                                <div style="background: var(--primary-500); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600;">3</div>
                                <span style="font-size: 0.875rem;">Get summary and study plan</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: var(--space-2);">
                                <div style="background: var(--primary-500); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600;">4</div>
                                <span style="font-size: 0.875rem;">Start studying effectively</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Usage Stats</h3>
                    </div>
                    <div class="card-body">
                        <div class="stats-grid" style="grid-template-columns: 1fr;">
                            <div class="text-center">
                                <span class="stat-number" style="font-size: 2rem;" id="documents-analyzed">0</span>
                                <div class="stat-label">Documents Analyzed</div>
                            </div>
                            <div class="text-center mt-3">
                                <span class="stat-number" style="font-size: 2rem;" id="study-plans-generated">0</span>
                                <div class="stat-label">Study Plans Generated</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Your AI Summaries</h3>
                    <div class="search-box" style="max-width: 300px;">
                        <span class="search-icon">🔍</span>
                        <input type="text" id="search-summaries" class="search-input" placeholder="Search summaries...">
                    </div>
                </div>
                <div class="card-body">
                    <div id="ai-summaries-list">
                        <p class="text-center">Loading...</p>
                    </div>
                </div>
            </div>
        `;

        await this.loadSummaries();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // File upload
        const fileInput = document.getElementById('ai-file-input');
        const uploadArea = document.getElementById('ai-file-upload');

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
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileUpload(file);
            }
        });

        // Search
        document.getElementById('search-summaries').addEventListener('input', (e) => {
            this.searchSummaries(e.target.value);
        });
    }

    async handleFileUpload(file) {
        // Validate file
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        
        if (file.size > maxSize) {
            showError('File size must be less than 10MB');
            return;
        }

        if (!allowedTypes.includes(file.type)) {
            showError('Please upload a PDF, DOC, DOCX, or TXT file');
            return;
        }

        try {
            // Show processing message
            showSuccess('Processing document... This may take a moment.');
            
            // Upload file to storage
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `ai-documents/${this.user.id}/${fileName}`;
            
            await uploadFile('resources', filePath, file);

            // Generate AI summary (placeholder implementation)
            await this.generateAISummary(file.name, filePath);
            
        } catch (error) {
            console.error('Upload error:', error);
            showError('Failed to upload and process document');
        }
    }

    async generateAISummary(fileName, filePath) {
        try {
            // This is a placeholder implementation
            // In a real app, you would send the file to an AI service like OpenAI, Claude, etc.
            const mockSummary = this.generateMockSummary(fileName);
            const mockStudyPlan = this.generateMockStudyPlan(fileName);

            const { error } = await supabase
                .from('ai_summaries')
                .insert([{
                    user_id: this.user.id,
                    document_title: fileName,
                    document_path: filePath,
                    summary: mockSummary,
                    study_plan: mockStudyPlan
                }]);

            if (error) throw error;

            showSuccess('Document analyzed successfully! 🤖');
            await this.loadSummaries();
            
        } catch (error) {
            console.error('Error generating summary:', error);
            showError('Failed to generate summary');
        }
    }

    generateMockSummary(fileName) {
        const summaries = [
            `This document covers fundamental concepts in the subject area. Key topics include theoretical frameworks, practical applications, and important methodologies. The content is structured to build understanding progressively from basic principles to advanced applications. Notable sections discuss real-world examples and case studies that demonstrate the practical relevance of the concepts presented.`,
            
            `The document presents a comprehensive overview of the topic with detailed explanations and supporting evidence. Main themes include core principles, analytical approaches, and implementation strategies. The material includes visual aids, diagrams, and examples to enhance understanding. Critical points are highlighted throughout to emphasize their importance in the broader context.`,
            
            `This resource provides an in-depth examination of key concepts and their interconnections. The document is organized into logical sections covering background information, current methodologies, and future perspectives. Important findings and conclusions are presented with supporting data and references to additional resources for further study.`
        ];

        return summaries[Math.floor(Math.random() * summaries.length)] + 
               `\n\nKey takeaways from "${fileName}":\n• Essential concepts are clearly defined\n• Practical examples illustrate theoretical points\n• Current research and developments are discussed\n• Future implications and applications are explored`;
    }

    generateMockStudyPlan(fileName) {
        const plans = [
            `Personalized Study Plan for "${fileName}":

Week 1: Foundation Building
• Read through the introductory sections (30-45 minutes daily)
• Create vocabulary flashcards for key terms
• Complete the review questions at the end of each chapter

Week 2: Deep Dive Analysis
• Focus on complex concepts and theories
• Practice with provided examples and exercises
• Create mind maps connecting different topics

Week 3: Application & Review
• Work on case studies and practical applications
• Review challenging sections multiple times
• Test understanding with self-assessment quizzes

Week 4: Synthesis & Mastery
• Integrate knowledge across all sections
• Create summary notes and key concept lists
• Prepare for assessments or practical applications

Study Tips:
• Schedule 30-45 minutes daily for consistent progress
• Use active recall techniques while studying
• Take breaks every 25-30 minutes to maintain focus
• Review previous material before starting new sections`,

            `Strategic Learning Approach for "${fileName}":

Phase 1: Overview & Orientation (Days 1-3)
• Skim through the entire document for big picture understanding
• Identify main themes and chapter objectives
• Create an outline of topics to be covered

Phase 2: Detailed Study (Days 4-14)
• Study 2-3 sections per day in depth
• Take detailed notes using the Cornell Note-taking method
• Practice explaining concepts in your own words

Phase 3: Integration & Application (Days 15-21)
• Connect concepts across different sections
• Work through practice problems and examples
• Create concept maps showing relationships

Phase 4: Mastery & Assessment (Days 22-28)
• Review all material systematically
• Test knowledge with practice questions
• Identify and strengthen weak areas

Recommended Study Schedule:
• Morning: 45 minutes focused reading
• Afternoon: 30 minutes practice/application
• Evening: 15 minutes review of key concepts`
        ];

        return plans[Math.floor(Math.random() * plans.length)];
    }

    async loadSummaries() {
        try {
            const { data: summaries, error } = await supabase
                .from('ai_summaries')
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.summaries = summaries || [];
            this.renderSummaries(this.summaries);
            this.updateStats();
        } catch (error) {
            console.error('Error loading summaries:', error);
            showError('Failed to load AI summaries');
        }
    }

    updateStats() {
        document.getElementById('documents-analyzed').textContent = this.summaries.length;
        document.getElementById('study-plans-generated').textContent = this.summaries.filter(s => s.study_plan).length;
    }

    renderSummaries(summaries) {
        const container = document.getElementById('ai-summaries-list');
        
        if (summaries.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--gray-500);">No AI summaries yet. Upload a document to get started!</p>';
            return;
        }

        container.innerHTML = `
            <div class="file-list">
                ${summaries.map(summary => this.renderSummaryCard(summary)).join('')}
            </div>
        `;

        this.setupSummaryEventListeners();
    }

    renderSummaryCard(summary) {
        return `
            <div class="file-item" data-summary-id="${summary.id}">
                <div class="file-info">
                    <div class="file-icon" style="background-color: var(--secondary-500);">🤖</div>
                    <div class="file-details">
                        <h4>${summary.document_title}</h4>
                        <div class="file-meta">
                            AI Analysis • ${formatDate(summary.created_at)}
                        </div>
                        <p style="margin-top: var(--space-1); font-size: 0.875rem; color: var(--gray-600);">
                            ${summary.summary.substring(0, 120)}...
                        </p>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-sm btn-primary view-summary-btn" data-summary-id="${summary.id}">View Summary</button>
                    <button class="btn btn-sm btn-accent view-study-plan-btn" data-summary-id="${summary.id}">Study Plan</button>
                    <button class="btn btn-sm btn-secondary download-doc-btn" data-summary-id="${summary.id}">Download</button>
                </div>
            </div>
        `;
    }

    setupSummaryEventListeners() {
        // View summary buttons
        document.querySelectorAll('.view-summary-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const summaryId = e.target.dataset.summaryId;
                this.viewSummary(summaryId);
            });
        });

        // View study plan buttons
        document.querySelectorAll('.view-study-plan-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const summaryId = e.target.dataset.summaryId;
                this.viewStudyPlan(summaryId);
            });
        });

        // Download buttons
        document.querySelectorAll('.download-doc-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const summaryId = e.target.dataset.summaryId;
                this.downloadDocument(summaryId);
            });
        });
    }

    viewSummary(summaryId) {
        const summary = this.summaries.find(s => s.id === summaryId);
        if (!summary) return;

        const modalContent = `
            <div class="ai-summary-content">
                <div class="form-group">
                    <h4 style="color: var(--primary-600); margin-bottom: var(--space-2);">
                        📄 ${summary.document_title}
                    </h4>
                    <div style="background: var(--primary-50); padding: var(--space-3); border-radius: var(--radius-md); margin-bottom: var(--space-3);">
                        <div style="font-size: 0.875rem; color: var(--primary-700); margin-bottom: var(--space-1);">
                            <strong>AI-Generated Summary</strong>
                        </div>
                        <div style="line-height: 1.6; white-space: pre-line;">
                            ${summary.summary}
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-top: var(--space-4);">
                        <button class="btn btn-secondary" id="close-summary">Close</button>
                        <div>
                            <button class="btn btn-accent" id="view-study-plan" data-summary-id="${summary.id}">
                                View Study Plan
                            </button>
                            <button class="btn btn-primary" id="create-flashcards" data-summary-id="${summary.id}">
                                Create Flashcards
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        openModal(`AI Summary - ${summary.document_title}`, modalContent);

        document.getElementById('close-summary').addEventListener('click', closeModal);
        
        document.getElementById('view-study-plan').addEventListener('click', () => {
            closeModal();
            this.viewStudyPlan(summaryId);
        });

        document.getElementById('create-flashcards').addEventListener('click', () => {
            closeModal();
            this.createFlashcardsFromSummary(summary);
        });
    }

    viewStudyPlan(summaryId) {
        const summary = this.summaries.find(s => s.id === summaryId);
        if (!summary) return;

        const modalContent = `
            <div class="study-plan-content">
                <div class="form-group">
                    <h4 style="color: var(--accent-600); margin-bottom: var(--space-2);">
                        📚 Study Plan for ${summary.document_title}
                    </h4>
                    <div style="background: var(--accent-50); padding: var(--space-3); border-radius: var(--radius-md); margin-bottom: var(--space-3);">
                        <div style="font-size: 0.875rem; color: var(--accent-700); margin-bottom: var(--space-1);">
                            <strong>Personalized Study Plan</strong>
                        </div>
                        <div style="line-height: 1.6; white-space: pre-line;">
                            ${summary.study_plan || 'No study plan generated for this document.'}
                        </div>
                    </div>
                    
                    <div class="alert alert-info">
                        <strong>Pro Tip:</strong> Use the Study Timer to follow your plan with focused Pomodoro sessions!
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-top: var(--space-4);">
                        <button class="btn btn-secondary" id="close-study-plan">Close</button>
                        <div>
                            <button class="btn btn-primary" id="start-study-timer">
                                Start Study Timer
                            </button>
                            <button class="btn btn-accent" id="save-to-calendar">
                                Save to Calendar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        openModal(`Study Plan - ${summary.document_title}`, modalContent);

        document.getElementById('close-study-plan').addEventListener('click', closeModal);
        
        document.getElementById('start-study-timer').addEventListener('click', () => {
            closeModal();
            // This would navigate to the study timer page
            showSuccess('Navigate to Study Timer to start your focused study session!');
        });

        document.getElementById('save-to-calendar').addEventListener('click', () => {
            this.saveStudyPlanToCalendar(summary);
        });
    }

    async createFlashcardsFromSummary(summary) {
        try {
            // Create a new flashcard deck based on the summary
            const deckData = {
                title: `Flashcards: ${summary.document_title}`,
                description: 'Generated from AI summary',
                subject: 'general',
                user_id: this.user.id
            };

            const { data: deck, error: deckError } = await supabase
                .from('flashcard_decks')
                .insert([deckData])
                .select()
                .single();

            if (deckError) throw deckError;

            // Generate sample flashcards based on the summary
            const sampleCards = this.generateFlashcardsFromText(summary.summary);
            
            const cardPromises = sampleCards.map(card => 
                supabase.from('flashcards').insert([{
                    deck_id: deck.id,
                    question: card.question,
                    answer: card.answer
                }])
            );

            await Promise.all(cardPromises);

            showSuccess('Flashcard deck created successfully! Check the Flashcards page to study.');
        } catch (error) {
            console.error('Error creating flashcards:', error);
            showError('Failed to create flashcards');
        }
    }

    generateFlashcardsFromText(text) {
        // Simple flashcard generation based on text content
        // In a real app, you would use more sophisticated NLP
        const sentences = text.split('.').filter(s => s.trim().length > 20);
        const cards = [];

        // Generate question-answer pairs from key sentences
        sentences.slice(0, 5).forEach((sentence, index) => {
            const cleanSentence = sentence.trim();
            if (cleanSentence.includes('important') || cleanSentence.includes('key') || cleanSentence.includes('concepts')) {
                cards.push({
                    question: `What does the document say about key concepts?`,
                    answer: cleanSentence
                });
            } else {
                cards.push({
                    question: `Question ${index + 1}: What is mentioned about the main topic?`,
                    answer: cleanSentence
                });
            }
        });

        return cards.length > 0 ? cards : [{
            question: 'What is the main topic of this document?',
            answer: 'This document covers important concepts and methodologies in the subject area.'
        }];
    }

    saveStudyPlanToCalendar(summary) {
        // Generate calendar event
        const title = `Study: ${summary.document_title}`;
        const details = summary.study_plan?.substring(0, 200) || 'AI-generated study plan';
        
        // Create calendar URL (Google Calendar)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1); // Tomorrow
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later

        const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(details)}`;
        
        window.open(calendarUrl, '_blank');
        showSuccess('Study plan calendar event created!');
    }

    async downloadDocument(summaryId) {
        try {
            const summary = this.summaries.find(s => s.id === summaryId);
            if (!summary) return;

            // In a real app, you would download from Supabase Storage
            showSuccess('Document download started...');
            
        } catch (error) {
            showError('Failed to download document');
        }
    }

    searchSummaries(query) {
        if (!query.trim()) {
            this.renderSummaries(this.summaries);
            return;
        }

        const filtered = this.summaries.filter(summary => 
            summary.document_title.toLowerCase().includes(query.toLowerCase()) ||
            summary.summary.toLowerCase().includes(query.toLowerCase())
        );

        this.renderSummaries(filtered);
    }

    cleanup() {
        // Clean up any listeners or timers
    }
}