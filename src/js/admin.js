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
                    <button class="card-btn btn-export" onclick="admin.exportToPdf('${pres.id}', '${this.escapeHtml(pres.title)}')">
                        <svg width="16" height="16"><use href="#icon-pdf"></use></svg> Export PDF
                    </button>
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

    async exportToPdf(id, title) {
        this.showToast('Generating PDF... This may take a moment', 'info');

        try {
            // Open the presentation in a hidden iframe to render it
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.left = '-9999px';
            iframe.style.width = '1280px';
            iframe.style.height = '720px';
            document.body.appendChild(iframe);

            // Load the presentation
            const presentationUrl = `/presentations/${id}/`;

            iframe.onload = async () => {
                try {
                    const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
                    const slides = iframeDocument.querySelectorAll('.slide');

                    if (slides.length === 0) {
                        this.showToast('No slides found in presentation', 'error');
                        document.body.removeChild(iframe);
                        return;
                    }

                    // Use html2pdf's bundled jsPDF and html2canvas
                    const { jsPDF } = window.jspdf || window;

                    // Create PDF document
                    const pdf = new jsPDF({
                        orientation: 'landscape',
                        unit: 'px',
                        format: [1280, 720],
                        compress: true
                    });

                    // Process each slide
                    for (let i = 0; i < slides.length; i++) {
                        // Make only this slide visible
                        slides.forEach((s, idx) => {
                            if (idx === i) {
                                s.style.display = 'flex';
                                s.style.opacity = '1';
                                s.style.position = 'relative';
                            } else {
                                s.style.display = 'none';
                            }
                        });

                        // Remove presenter notes
                        const notes = slides[i].querySelectorAll('.presenter-notes');
                        notes.forEach(note => note.style.display = 'none');

                        // Wait a bit for rendering
                        await new Promise(resolve => setTimeout(resolve, 100));

                        // Capture the slide container
                        const slideContainer = iframeDocument.querySelector('.slides');

                        const canvas = await html2canvas(slideContainer, {
                            scale: 2,
                            useCORS: true,
                            logging: false,
                            width: 1280,
                            height: 720,
                            windowWidth: 1280,
                            windowHeight: 720
                        });

                        // Convert canvas to image
                        const imgData = canvas.toDataURL('image/jpeg', 0.95);

                        // Add page to PDF (except for first page which already exists)
                        if (i > 0) {
                            pdf.addPage([1280, 720], 'landscape');
                        }

                        // Add image to PDF
                        pdf.addImage(imgData, 'JPEG', 0, 0, 1280, 720);
                    }

                    // Save the PDF
                    pdf.save(`${id}.pdf`);

                    this.showToast('PDF exported successfully!');
                    document.body.removeChild(iframe);
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    this.showToast('Failed to generate PDF', 'error');
                    document.body.removeChild(iframe);
                }
            };

            iframe.onerror = () => {
                this.showToast('Failed to load presentation', 'error');
                document.body.removeChild(iframe);
            };

            iframe.src = presentationUrl;

        } catch (error) {
            console.error('Error exporting to PDF:', error);
            this.showToast('Failed to export PDF', 'error');
        }
    }

    showToast(message, type = 'success') {
        this.toast.textContent = message;
        this.toast.className = 'toast show';
        if (type === 'error') {
            this.toast.classList.add('error');
        } else if (type === 'info') {
            this.toast.classList.add('info');
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
