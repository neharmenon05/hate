import { supabase } from '../supabase-client.js';
import { showError, showSuccess, openModal, closeModal } from '../utils.js';

export class FlashcardsPage {
    constructor(user, profile) {
        this.user = user;
        this.profile = profile;
        this.flashcards = [];
        this.currentDeck = null;
        this.currentCardIndex = 0;
        this.isFlipped = false;
    }

    async render() {
        const pageContent = document.getElementById('page-content');
        
        pageContent.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Flashcards</h1>
                <p class="page-subtitle">Create and study with digital flashcards</p>
            </div>

            <div class="grid grid-cols-2 mb-4">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Your Decks</h3>
                        <button class="btn btn-sm btn-primary" id="create-deck-btn">Create Deck</button>
                    </div>
                    <div class="card-body">
                        <div id="flashcard-decks">
                            <p class="text-center">Loading...</p>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Study Stats</h3>
                    </div>
                    <div class="card-body">
                        <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
                            <div class="text-center">
                                <span class="stat-number" style="font-size: 2rem;" id="total-decks">0</span>
                                <div class="stat-label">Total Decks</div>
                            </div>
                            <div class="text-center">
                                <span class="stat-number" style="font-size: 2rem;" id="total-cards">0</span>
                                <div class="stat-label">Total Cards</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" id="study-area" style="display: none;">
                <div class="card-header">
                    <h3 class="card-title" id="current-deck-title">Study Session</h3>
                    <div>
                        <button class="btn btn-sm btn-secondary" id="end-study-btn">End Study</button>
                        <button class="btn btn-sm btn-accent" id="add-card-btn">Add Card</button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="text-center mb-4">
                        <span id="card-counter">1 / 10</span>
                    </div>
                    
                    <div class="flashcard" id="flashcard">
                        <div class="flashcard-inner">
                            <div class="flashcard-front">
                                <div class="flashcard-content" id="card-question">
                                    Click to start studying
                                </div>
                            </div>
                            <div class="flashcard-back">
                                <div class="flashcard-content" id="card-answer">
                                    Answer will appear here
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="text-center mt-4">
                        <div class="btn-group" style="display: flex; justify-content: center; gap: var(--space-2);">
                            <button class="btn btn-secondary" id="prev-card-btn">← Previous</button>
                            <button class="btn btn-primary" id="flip-card-btn">Flip Card</button>
                            <button class="btn btn-secondary" id="next-card-btn">Next →</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadFlashcardDecks();
        this.setupEventListeners();
    }

    async loadFlashcardDecks() {
        try {
            const { data: decks, error } = await supabase
                .from('flashcard_decks')
                .select(`
                    *,
                    flashcards(count)
                `)
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.flashcardDecks = decks || [];
            this.renderFlashcardDecks();
            this.updateStats();
        } catch (error) {
            console.error('Error loading flashcard decks:', error);
            showError('Failed to load flashcard decks');
        }
    }

    renderFlashcardDecks() {
        const container = document.getElementById('flashcard-decks');
        
        if (this.flashcardDecks.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--gray-500);">No flashcard decks yet</p>';
            return;
        }

        container.innerHTML = this.flashcardDecks.map(deck => `
            <div class="file-item" style="margin-bottom: var(--space-2); background: var(--gray-50);">
                <div class="file-info">
                    <div class="file-icon" style="background-color: var(--secondary-500);">🎴</div>
                    <div class="file-details">
                        <h4>${deck.title}</h4>
                        <div class="file-meta">${deck.subject || 'General'} • ${deck.flashcards?.length || 0} cards</div>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-sm btn-primary study-deck-btn" data-deck-id="${deck.id}">Study</button>
                    <button class="btn btn-sm btn-secondary edit-deck-btn" data-deck-id="${deck.id}">Edit</button>
                </div>
            </div>
        `).join('');

        this.setupDeckEventListeners();
    }

    setupDeckEventListeners() {
        document.querySelectorAll('.study-deck-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const deckId = parseInt(e.target.dataset.deckId);
                this.startStudySession(deckId);
            });
        });

        document.querySelectorAll('.edit-deck-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const deckId = parseInt(e.target.dataset.deckId);
                this.editDeck(deckId);
            });
        });
    }

    updateStats() {
        document.getElementById('total-decks').textContent = this.flashcardDecks.length;
        const totalCards = this.flashcardDecks.reduce((sum, deck) => sum + (deck.flashcards?.length || 0), 0);
        document.getElementById('total-cards').textContent = totalCards;
    }

    async startStudySession(deckId) {
        try {
            const { data: cards, error } = await supabase
                .from('flashcards')
                .select('*')
                .eq('deck_id', deckId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (!cards || cards.length === 0) {
                showError('This deck has no cards yet');
                return;
            }

            this.flashcards = cards;
            this.currentDeck = this.flashcardDecks.find(d => d.id === deckId);
            this.currentCardIndex = 0;
            this.isFlipped = false;

            document.getElementById('study-area').style.display = 'block';
            document.getElementById('current-deck-title').textContent = `Studying: ${this.currentDeck.title}`;
            
            this.showCurrentCard();
            this.setupStudyEventListeners();

        } catch (error) {
            showError('Failed to start study session');
        }
    }

    showCurrentCard() {
        if (this.flashcards.length === 0) return;

        const card = this.flashcards[this.currentCardIndex];
        document.getElementById('card-question').textContent = card.question;
        document.getElementById('card-answer').textContent = card.answer;
        document.getElementById('card-counter').textContent = `${this.currentCardIndex + 1} / ${this.flashcards.length}`;

        // Reset flip state
        this.isFlipped = false;
        document.getElementById('flashcard').classList.remove('flipped');
        
        // Update navigation buttons
        document.getElementById('prev-card-btn').disabled = this.currentCardIndex === 0;
        document.getElementById('next-card-btn').disabled = this.currentCardIndex === this.flashcards.length - 1;
    }

    setupStudyEventListeners() {
        document.getElementById('flip-card-btn').addEventListener('click', () => {
            this.flipCard();
        });

        document.getElementById('flashcard').addEventListener('click', () => {
            this.flipCard();
        });

        document.getElementById('prev-card-btn').addEventListener('click', () => {
            if (this.currentCardIndex > 0) {
                this.currentCardIndex--;
                this.showCurrentCard();
            }
        });

        document.getElementById('next-card-btn').addEventListener('click', () => {
            if (this.currentCardIndex < this.flashcards.length - 1) {
                this.currentCardIndex++;
                this.showCurrentCard();
            }
        });

        document.getElementById('end-study-btn').addEventListener('click', () => {
            document.getElementById('study-area').style.display = 'none';
            this.currentDeck = null;
        });

        document.getElementById('add-card-btn').addEventListener('click', () => {
            this.openAddCardModal();
        });
    }

    flipCard() {
        this.isFlipped = !this.isFlipped;
        document.getElementById('flashcard').classList.toggle('flipped', this.isFlipped);
    }

    setupEventListeners() {
        document.getElementById('create-deck-btn').addEventListener('click', () => {
            this.openCreateDeckModal();
        });
    }

    openCreateDeckModal() {
        const modalContent = `
            <form id="create-deck-form">
                <div class="form-group">
                    <label for="deck-title">Deck Title</label>
                    <input type="text" id="deck-title" required>
                </div>
                <div class="form-group">
                    <label for="deck-subject">Subject</label>
                    <select id="deck-subject">
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
                    <label for="deck-description">Description</label>
                    <textarea id="deck-description" rows="3"></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Create Deck</button>
            </form>
        `;

        openModal('Create Flashcard Deck', modalContent);

        document.getElementById('create-deck-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreateDeck();
        });
    }

    async handleCreateDeck() {
        try {
            const deckData = {
                title: document.getElementById('deck-title').value,
                subject: document.getElementById('deck-subject').value,
                description: document.getElementById('deck-description').value,
                user_id: this.user.id
            };

            const { error } = await supabase
                .from('flashcard_decks')
                .insert([deckData]);

            if (error) throw error;

            closeModal();
            showSuccess('Flashcard deck created successfully!');
            await this.loadFlashcardDecks();
        } catch (error) {
            showError(error.message);
        }
    }

    openAddCardModal() {
        if (!this.currentDeck) return;

        const modalContent = `
            <form id="add-card-form">
                <div class="form-group">
                    <label for="card-question">Question (Front)</label>
                    <textarea id="card-question" rows="3" required></textarea>
                </div>
                <div class="form-group">
                    <label for="card-answer">Answer (Back)</label>
                    <textarea id="card-answer" rows="3" required></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Add Card</button>
            </form>
        `;

        openModal('Add Flashcard', modalContent);

        document.getElementById('add-card-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddCard();
        });
    }

    async handleAddCard() {
        try {
            const cardData = {
                deck_id: this.currentDeck.id,
                question: document.getElementById('card-question').value,
                answer: document.getElementById('card-answer').value
            };

            const { error } = await supabase
                .from('flashcards')
                .insert([cardData]);

            if (error) throw error;

            closeModal();
            showSuccess('Flashcard added successfully!');
            
            // Reload the current study session
            await this.startStudySession(this.currentDeck.id);
        } catch (error) {
            showError(error.message);
        }
    }

    async editDeck(deckId) {
        const deck = this.flashcardDecks.find(d => d.id === deckId);
        if (!deck) return;

        // Load cards for this deck
        try {
            const { data: cards, error } = await supabase
                .from('flashcards')
                .select('*')
                .eq('deck_id', deckId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            const modalContent = `
                <div class="form-group">
                    <h4>${deck.title}</h4>
                    <p style="color: var(--gray-600);">${deck.description || 'No description'}</p>
                </div>

                <div class="form-group">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
                        <label>Cards in this deck</label>
                        <button class="btn btn-sm btn-primary" id="add-card-to-deck">Add Card</button>
                    </div>
                    <div id="deck-cards">
                        ${(cards || []).map(card => `
                            <div class="card" style="margin-bottom: var(--space-2); padding: var(--space-3);">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 500; margin-bottom: var(--space-1);">Q: ${card.question}</div>
                                        <div style="color: var(--gray-600); font-size: 0.875rem;">A: ${card.answer}</div>
                                    </div>
                                    <button class="btn btn-sm btn-accent delete-card-btn" data-card-id="${card.id}">Delete</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            openModal(`Edit Deck - ${deck.title}`, modalContent);
            this.setupEditDeckListeners(deckId);

        } catch (error) {
            showError('Failed to load deck details');
        }
    }

    setupEditDeckListeners(deckId) {
        document.getElementById('add-card-to-deck').addEventListener('click', () => {
            this.currentDeck = this.flashcardDecks.find(d => d.id === deckId);
            closeModal();
            this.openAddCardModal();
        });

        document.querySelectorAll('.delete-card-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const cardId = parseInt(e.target.dataset.cardId);
                await this.deleteCard(cardId);
                this.editDeck(deckId); // Refresh the modal
            });
        });
    }

    async deleteCard(cardId) {
        try {
            const { error } = await supabase
                .from('flashcards')
                .delete()
                .eq('id', cardId);

            if (error) throw error;

            showSuccess('Card deleted successfully!');
        } catch (error) {
            showError('Failed to delete card');
        }
    }

    cleanup() {
        // Clean up any active study sessions
        this.currentDeck = null;
        this.flashcards = [];
    }
}