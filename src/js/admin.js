// Admin Dashboard
class AdminDashboard {
    constructor() {
        this.presentations = [];
        this.modal = document.getElementById('new-presentation-modal');
        this.editInfoModal = document.getElementById('edit-info-modal');
        this.toast = document.getElementById('toast');
        this.currentEditingId = null;
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
                    <div class="card-title-row">
                        <h3 class="card-title">${this.escapeHtml(pres.title)}</h3>
                        <button class="btn-icon btn-info" onclick="admin.openEditInfoModal('${pres.id}')" title="Edit presentation info">
                            <svg width="20" height="20"><use href="#icon-info"></use></svg>
                        </button>
                    </div>
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

        this.editInfoModal.addEventListener('click', (e) => {
            if (e.target === this.editInfoModal) {
                this.closeEditInfoModal();
            }
        });

        // Auto-format ID as user types
        document.getElementById('presentation-id').addEventListener('input', (e) => {
            e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        });

        // Save info button
        document.getElementById('save-info-btn').addEventListener('click', () => {
            this.saveEditInfo();
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

    async openEditInfoModal(id) {
        this.currentEditingId = id;
        const presentation = this.presentations.find(p => p.id === id);

        if (!presentation) {
            this.showToast('Presentation not found', 'error');
            return;
        }

        document.getElementById('edit-presentation-id').value = presentation.id;
        document.getElementById('edit-presentation-title').value = presentation.title;
        document.getElementById('edit-presentation-description').value = presentation.description || '';
        document.getElementById('edit-presentation-theme').value = presentation.theme || 'light';

        this.editInfoModal.classList.add('show');
    }

    closeEditInfoModal() {
        this.editInfoModal.classList.remove('show');
        this.currentEditingId = null;
    }

    async saveEditInfo() {
        if (!this.currentEditingId) return;

        const title = document.getElementById('edit-presentation-title').value.trim();
        const description = document.getElementById('edit-presentation-description').value.trim();
        const theme = document.getElementById('edit-presentation-theme').value.trim();

        if (!title) {
            this.showToast('Title is required', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/presentations/${this.currentEditingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, theme })
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                const data = await response.json();
                this.showToast(data.message);
                this.closeEditInfoModal();
                await this.loadPresentations();
            } else {
                const error = await response.json();
                this.showToast(error.error, 'error');
            }
        } catch (error) {
            console.error('Error updating presentation info:', error);
            this.showToast('Failed to update presentation info', 'error');
        }
    }

    editPresentation(id) {
        window.open(`/editor?id=${id}`, '_blank');
    }

    viewPresentation(id) {
        window.open(`/presentations/${id}/`, '_blank');
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
