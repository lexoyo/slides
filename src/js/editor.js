// Markdown editor with live preview
class SlideEditor {
    constructor() {
        this.editor = document.getElementById('markdown-editor');
        this.previewIframe = document.getElementById('preview-iframe');
        this.saveBtn = document.getElementById('save-btn');
        this.previewBtn = document.getElementById('preview-btn');
        this.refreshPreviewBtn = document.getElementById('refresh-preview-btn');
        this.toast = document.getElementById('toast');
        this.themeSelector = document.getElementById('theme-selector');

        this.debounceTimer = null;
        this.currentTheme = 'minimalist';

        // Get presentation ID from URL
        const params = new URLSearchParams(window.location.search);
        this.presentationId = params.get('id') || 'default';

        this.init();
    }

    async init() {
        // Load initial content and metadata
        await this.loadContent();
        await this.loadMetadata();

        // Setup event listeners
        this.setupEventListeners();

        // Load preview iframe
        this.loadPreview();
    }

    async loadMetadata() {
        try {
            const response = await fetch(`/api/presentations/${this.presentationId}`);

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                const metadata = await response.json();
                this.currentTheme = metadata.theme || 'minimalist';
                this.themeSelector.value = this.currentTheme;
            }
        } catch (error) {
            console.error('Error loading metadata:', error);
        }
    }

    async loadContent() {
        try {
            console.log('Fetching content from /api/slides/content?id=' + this.presentationId);
            const response = await fetch(`/api/slides/content?id=${this.presentationId}`);
            console.log('Response status:', response.status);

            if (response.status === 401) {
                // Not authenticated, redirect to login
                console.log('Not authenticated, redirecting to login');
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                const data = await response.json();
                console.log('Received data:', data);
                console.log('Content length:', data.content?.length);

                this.editor.value = data.content || '';
                console.log('Editor value set, length:', this.editor.value.length);
            } else {
                console.error('Response not ok:', response.status, response.statusText);
                this.showToast('Failed to load content', 'error');
            }
        } catch (error) {
            console.error('Error loading content:', error);
            this.showToast('Failed to load content', 'error');
        }
    }

    setupEventListeners() {
        // Save button
        this.saveBtn.addEventListener('click', () => this.saveContent());

        // Preview toggle (for mobile)
        if (this.previewBtn) {
            this.previewBtn.addEventListener('click', () => this.togglePreview());
        }

        // Refresh preview button
        this.refreshPreviewBtn.addEventListener('click', () => this.loadPreview());

        // Image upload button
        const uploadInput = document.getElementById('image-upload');
        uploadInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop
        this.setupDragAndDrop();

        // Theme selector
        this.themeSelector.addEventListener('change', (e) => {
            this.currentTheme = e.target.value;
            this.showToast(`Theme changed to ${this.currentTheme}. Save to apply.`, 'info');
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveContent();
            }
        });
    }

    setupDragAndDrop() {
        const editorWrapper = document.querySelector('.editor-wrapper');
        const overlay = document.getElementById('upload-overlay');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            editorWrapper.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        editorWrapper.addEventListener('dragenter', () => {
            overlay.classList.add('active');
        });

        editorWrapper.addEventListener('dragleave', (e) => {
            if (e.target === editorWrapper) {
                overlay.classList.remove('active');
            }
        });

        editorWrapper.addEventListener('drop', (e) => {
            overlay.classList.remove('active');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.uploadImage(files[0]);
            }
        });
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.uploadImage(files[0]);
        }
    }

    async uploadImage(file) {
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        this.showToast('Uploading image...', 'info');

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                const data = await response.json();
                this.insertImageMarkdown(data.url, file.name);
                this.showToast('Image uploaded!');
            } else {
                const error = await response.json();
                this.showToast(error.error || 'Upload failed', 'error');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            this.showToast('Upload failed', 'error');
        }
    }

    loadPreview() {
        this.previewIframe.src = `/?id=${this.presentationId}`;
    }

    insertImageMarkdown(url, altText) {
        const cursorPos = this.editor.selectionStart;
        const textBefore = this.editor.value.substring(0, cursorPos);
        const textAfter = this.editor.value.substring(cursorPos);

        const markdown = `![${altText}](${url})`;
        this.editor.value = textBefore + markdown + textAfter;

        // Move cursor after inserted markdown
        const newCursorPos = cursorPos + markdown.length;
        this.editor.setSelectionRange(newCursorPos, newCursorPos);
        this.editor.focus();
    }


    async saveContent() {
        const content = this.editor.value;

        this.saveBtn.disabled = true;
        this.saveBtn.textContent = 'Saving...';

        try {
            const response = await fetch('/api/slides/content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content,
                    id: this.presentationId,
                    theme: this.currentTheme
                }),
            });

            if (response.status === 401) {
                // Not authenticated, redirect to login
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                const data = await response.json();
                this.showToast(data.message || 'Saved successfully!');

                // Trigger rebuild (you may want to add a rebuild endpoint)
                this.showToast('Remember to rebuild: npm run build', 'info');
            } else {
                const error = await response.json();
                this.showToast(error.error || 'Failed to save', 'error');
            }
        } catch (error) {
            console.error('Error saving content:', error);
            this.showToast('Failed to save content', 'error');
        } finally {
            this.saveBtn.disabled = false;
            this.saveBtn.textContent = 'Save';
        }
    }

    togglePreview() {
        const previewPane = document.getElementById('preview-pane');
        previewPane.classList.toggle('visible');
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
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new SlideEditor();
    });
} else {
    new SlideEditor();
}
