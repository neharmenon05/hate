import { hideElement, showElement } from './utils.js';
import { StudentDashboard } from './pages/student-dashboard.js';
import { TeacherDashboard } from './pages/teacher-dashboard.js';
import { ResourcesPage } from './pages/resources.js';
import { AssignmentsPage } from './pages/assignments.js';
import { FlashcardsPage } from './pages/flashcards.js';
import { StudyTimerPage } from './pages/study-timer.js';
import { AIAssistantPage } from './pages/ai-assistant.js';
import { ClassesPage } from './pages/classes.js';
import { GradingPage } from './pages/grading.js';

class App {
    constructor(user, profile) {
        this.user = user;
        this.profile = profile;
        this.currentPage = null;
        this.pages = {};
        
        this.init();
    }

    init() {
        this.setupSidebar();
        this.setupMobileMenu();
        this.initializePages();
        this.navigateToDefaultPage();
    }

    setupSidebar() {
        const userInfo = document.getElementById('user-info');
        userInfo.innerHTML = `
            <div class="user-name">${this.profile.full_name}</div>
            <div class="user-role">${this.profile.role}</div>
        `;

        const sidebarMenu = document.getElementById('sidebar-menu');
        const menuItems = this.getMenuItems();
        
        sidebarMenu.innerHTML = menuItems.map(item => `
            <li>
                <a href="#" data-page="${item.page}" class="sidebar-link">
                    <span class="sidebar-icon">${item.icon}</span>
                    ${item.label}
                </a>
            </li>
        `).join('');

        // Add click listeners
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                this.navigateToPage(page);
                
                // Update active state
                document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
    }

    setupMobileMenu() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        
        // Create overlay for mobile
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebar-overlay';
        document.body.appendChild(overlay);
        
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
        
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    getMenuItems() {
        const commonItems = [
            { page: 'ai-assistant', label: 'AI Assistant', icon: '🤖' },
            { page: 'flashcards', label: 'Flashcards', icon: '📚' },
            { page: 'study-timer', label: 'Study Timer', icon: '⏰' }
        ];

        if (this.profile.role === 'student') {
            return [
                { page: 'dashboard', label: 'Dashboard', icon: '🏠' },
                { page: 'resources', label: 'Resources', icon: '📁' },
                { page: 'assignments', label: 'Assignments', icon: '📝' },
                ...commonItems
            ];
        } else {
            return [
                { page: 'dashboard', label: 'Dashboard', icon: '🏠' },
                { page: 'classes', label: 'Classes', icon: '👥' },
                { page: 'assignments', label: 'Assignments', icon: '📝' },
                { page: 'grading', label: 'Grading', icon: '✅' },
                ...commonItems
            ];
        }
    }

    initializePages() {
        if (this.profile.role === 'student') {
            this.pages.dashboard = new StudentDashboard(this.user, this.profile);
            this.pages.resources = new ResourcesPage(this.user, this.profile);
            this.pages.assignments = new AssignmentsPage(this.user, this.profile);
        } else {
            this.pages.dashboard = new TeacherDashboard(this.user, this.profile);
            this.pages.classes = new ClassesPage(this.user, this.profile);
            this.pages.assignments = new AssignmentsPage(this.user, this.profile);
            this.pages.grading = new GradingPage(this.user, this.profile);
        }

        // Common pages for both roles
        this.pages.flashcards = new FlashcardsPage(this.user, this.profile);
        this.pages['study-timer'] = new StudyTimerPage(this.user, this.profile);
        this.pages['ai-assistant'] = new AIAssistantPage(this.user, this.profile);
    }

    navigateToPage(pageName) {
        if (this.currentPage && this.pages[this.currentPage]) {
            this.pages[this.currentPage].cleanup();
        }

        this.currentPage = pageName;
        const page = this.pages[pageName];
        
        if (page) {
            page.render();
        } else {
            document.getElementById('page-content').innerHTML = `
                <div class="page-header">
                    <h1 class="page-title">Page Not Found</h1>
                    <p class="page-subtitle">The requested page could not be found.</p>
                </div>
            `;
        }
    }

    navigateToDefaultPage() {
        const firstLink = document.querySelector('.sidebar-link');
        if (firstLink) {
            firstLink.classList.add('active');
            const defaultPage = firstLink.dataset.page;
            this.navigateToPage(defaultPage);
        }
    }
}

export function initApp(user, profile) {
    new App(user, profile);
}