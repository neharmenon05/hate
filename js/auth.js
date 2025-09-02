import { supabase, signUp, signIn, signOut, getCurrentUser, getUserProfile } from './supabase-client.js';
import { showError, showSuccess, hideElement, showElement } from './utils.js';
import { initApp } from './app.js';

class AuthManager {
    constructor() {
        this.user = null;
        this.profile = null;
        this.init();
    }

    async init() {
        // Check for existing session
        try {
            const user = await getCurrentUser();
            if (user) {
                await this.handleUserSession(user);
            } else {
                this.showAuthForm();
            }
        } catch (error) {
            console.error('Error getting current user:', error);
            this.showAuthForm();
        }

        this.setupEventListeners();
        this.setupAuthStateListener();
    }

    setupEventListeners() {
        // Form toggles
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Form submissions
        document.getElementById('login-form').addEventListener('submit', (e) => {
            this.handleLogin(e);
        });

        document.getElementById('register-form').addEventListener('submit', (e) => {
            this.handleRegister(e);
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });
    }

    setupAuthStateListener() {
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                await this.handleUserSession(session.user);
            } else if (event === 'SIGNED_OUT') {
                this.handleSignOut();
            }
        });
    }

    async handleUserSession(user) {
        this.user = user;
        
        try {
            this.profile = await getUserProfile(user.id);
            hideElement('loading-screen');
            hideElement('auth-container');
            showElement('app-container');
            
            // Initialize the main app
            initApp(this.user, this.profile);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            this.showAuthForm();
        }
    }

    handleSignOut() {
        this.user = null;
        this.profile = null;
        hideElement('app-container');
        this.showAuthForm();
    }

    showAuthForm() {
        hideElement('loading-screen');
        hideElement('app-container');
        showElement('auth-container');
    }

    showLoginForm() {
        hideElement('register-form');
        showElement('login-form');
    }

    showRegisterForm() {
        hideElement('login-form');
        showElement('register-form');
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            await signIn(email, password);
        } catch (error) {
            showError(error.message);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const role = document.getElementById('register-role').value;

        try {
            await signUp(email, password, {
                full_name: name,
                role: role
            });
            
            showSuccess('Account created successfully! Please sign in.');
            this.showLoginForm();
        } catch (error) {
            showError(error.message);
        }
    }

    async handleLogout() {
        try {
            await signOut();
        } catch (error) {
            showError(error.message);
        }
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});