// Admin Dashboard
class AdminDashboard {
    constructor() {
        this.presentations = [];
        this.modal = document.getElementById('new-presentation-modal');
        this.toast = document.getElementById('toast');
        this.init();
    }

    async init() {
        await this.loadPresentations();
        this.setupEventListeners();
    }

    async loadPresentations() {
        try {
            const response = await fetch('/api/presentations');

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                const data = await response.json();
                this.presentations = data.presentations;
                this.renderPresentations();
            } else {
                this.showToast('Failed to load presentations', 'error');
            }
        } catch (error) {
            console.error('Error loading presentations:', error);
            this.showToast('Failed to load presentations', 'error');
        }
    }

    renderPresentations() {
        const container = document.getElementById('presentations-list');

        if (this.presentations.length === 0) {
            container.innerHTML = '<div class="loading">No presentations yet. Create your first one!</div>';
            return;
        }

        container.innerHTML = this.presentations.map(pres => `
            <div class="presentation-card">
                <div class="card-header">
                    <h3 class="card-title">${this.escapeHtml(pres.title)}</h3>
                    <div class="card-id">${this.escapeHtml(pres.id)}</div>
                </div>
                <p class="card-description">${this.escapeHtml(pres.description || 'No description')}</p>
                <div class="card-meta">
                    <span>Created: ${pres.created}</span>
                    <span>Modified: ${pres.modified}</span>
                </div>
                <div class="card-actions">
                    <button class="card-btn btn-edit" onclick="admin.editPresentation('${pres.id}')">Edit</button>
                    <button class="card-btn btn-view" onclick="admin.viewPresentation('${pres.id}')">View</button>
                    <button class="card-btn btn-present" onclick="admin.presentPresentation('${pres.id}')">Present</button>
                    <button class="card-btn btn-duplicate" onclick="admin.duplicatePresentation('${pres.id}')">Duplicate</button>
                    ${pres.id !== 'default' ? `<button class="card-btn btn-delete" onclick="admin.deletePresentation('${pres.id}')">Delete</button>` : '<div></div>'}
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        document.getElementById('new-presentation-btn').addEventListener('click', () => {
            this.openModal();
        });

        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('create-btn').addEventListener('click', () => {
            this.createPresentation();
        });

        // Close modal on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Auto-format ID as user types
        document.getElementById('presentation-id').addEventListener('input', (e) => {
            e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        });
    }

    openModal() {
        this.modal.classList.add('show');
        document.getElementById('presentation-id').value = '';
        document.getElementById('presentation-title').value = '';
        document.getElementById('presentation-description').value = '';
    }

    closeModal() {
        this.modal.classList.remove('show');
    }

    async createPresentation() {
        const id = document.getElementById('presentation-id').value.trim();
        const title = document.getElementById('presentation-title').value.trim();
        const description = document.getElementById('presentation-description').value.trim();

        if (!id || !title) {
            this.showToast('ID and title are required', 'error');
            return;
        }

        try {
            const response = await fetch('/api/presentations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, title, description })
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                const data = await response.json();
                this.showToast(data.message);
                this.closeModal();
                await this.loadPresentations();
            } else {
                const error = await response.json();
                this.showToast(error.error, 'error');
            }
        } catch (error) {
            console.error('Error creating presentation:', error);
            this.showToast('Failed to create presentation', 'error');
        }
    }

    editPresentation(id) {
        window.location.href = `/editor?id=${id}`;
    }

    viewPresentation(id) {
        window.open(`/?id=${id}`, '_blank');
    }

    presentPresentation(id) {
        window.open(`/presenter?id=${id}`, '_blank');
    }

    async duplicatePresentation(id) {
        const newId = prompt('Enter ID for the duplicate (lowercase, hyphens only):');
        if (!newId) return;

        if (!/^[a-z0-9-]+$/.test(newId)) {
            this.showToast('Invalid ID format', 'error');
            return;
        }

        const newTitle = prompt('Enter title for the duplicate:');
        if (!newTitle) return;

        try {
            const response = await fetch(`/api/presentations/${id}/duplicate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newId, newTitle })
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                const data = await response.json();
                this.showToast(data.message);
                await this.loadPresentations();
            } else {
                const error = await response.json();
                this.showToast(error.error, 'error');
            }
        } catch (error) {
            console.error('Error duplicating presentation:', error);
            this.showToast('Failed to duplicate presentation', 'error');
        }
    }

    async deletePresentation(id) {
        if (!confirm(`Are you sure you want to delete "${id}"? This cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/presentations/${id}`, {
                method: 'DELETE'
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                const data = await response.json();
                this.showToast(data.message);
                await this.loadPresentations();
            } else {
                const error = await response.json();
                this.showToast(error.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting presentation:', error);
            this.showToast('Failed to delete presentation', 'error');
        }
    }

    showToast(message, type = 'success') {
        this.toast.textContent = message;
        this.toast.className = 'toast show';
        if (type === 'error') {
            this.toast.classList.add('error');
        }
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Make admin global for onclick handlers
let admin;

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        admin = new AdminDashboard();
    });
} else {
    admin = new AdminDashboard();
}

// Global function for modal
function closeModal() {
    if (admin) admin.closeModal();
}
