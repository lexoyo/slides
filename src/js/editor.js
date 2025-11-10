// Markdown editor with live preview
class SlideEditor {
    constructor() {
        this.editor = document.getElementById('markdown-editor');
        this.previewContent = document.getElementById('preview-content');
        this.saveBtn = document.getElementById('save-btn');
        this.previewBtn = document.getElementById('preview-btn');
        this.prevSlideBtn = document.getElementById('prev-slide-btn');
        this.nextSlideBtn = document.getElementById('next-slide-btn');
        this.slideIndicator = document.getElementById('slide-indicator');
        this.toast = document.getElementById('toast');
        this.themeSelector = document.getElementById('theme-selector');

        this.currentSlideIndex = 0;
        this.slides = [];
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

        // Initial preview render
        this.updatePreview();
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
        // Editor input with debounce
        this.editor.addEventListener('input', () => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.updatePreview();
            }, 300);
        });

        // Save button
        this.saveBtn.addEventListener('click', () => this.saveContent());

        // Preview toggle (for mobile)
        this.previewBtn.addEventListener('click', () => this.togglePreview());

        // Slide navigation
        this.prevSlideBtn.addEventListener('click', () => this.navigateSlide(-1));
        this.nextSlideBtn.addEventListener('click', () => this.navigateSlide(1));

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

        // Update preview
        this.updatePreview();
    }

    updatePreview() {
        const content = this.editor.value;

        // Split into slides
        this.slides = content.split(/\n---+\n/).filter(slide => slide.trim());

        // Ensure current slide index is valid
        if (this.currentSlideIndex >= this.slides.length) {
            this.currentSlideIndex = Math.max(0, this.slides.length - 1);
        }

        // Render current slide
        this.renderSlide(this.currentSlideIndex);

        // Update navigation
        this.updateNavigation();
    }

    renderSlide(index) {
        if (this.slides.length === 0) {
            this.previewContent.innerHTML = '<p style="opacity: 0.5;">Start typing to see preview...</p>';
            return;
        }

        const slide = this.slides[index] || '';

        // Remove presenter notes for preview
        const slideWithoutNotes = slide.replace(/<!--\s*notes\s*\n[\s\S]*?\n-->/gi, '');

        // Convert markdown to HTML (simple conversion)
        const html = this.markdownToHtml(slideWithoutNotes);

        this.previewContent.innerHTML = html;
    }

    markdownToHtml(markdown) {
        let html = markdown;

        // Tables (must be early)
        html = this.parseMarkdownTables(html);

        // Images (must be before links)
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;">');

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Bold
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Italic
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Code inline
        html = html.replace(/`(.+?)`/g, '<code>$1</code>');

        // Code blocks
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

        // Unordered lists
        html = html.replace(/^\- (.+)$/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // Ordered lists
        html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');

        // Paragraphs
        html = html.split('\n\n').map(para => {
            if (!para.match(/^<[huplodivt]/)) {
                return `<p>${para.replace(/\n/g, '<br>')}</p>`;
            }
            return para;
        }).join('\n');

        return html;
    }

    parseMarkdownTables(markdown) {
        const lines = markdown.split('\n');
        let result = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];

            if (line.includes('|') && i + 1 < lines.length) {
                const nextLine = lines[i + 1];

                if (nextLine.includes('|') && nextLine.includes('-')) {
                    const headers = line.split('|').map(h => h.trim()).filter(h => h);
                    let tableRows = [];

                    i += 2;

                    while (i < lines.length && lines[i].includes('|')) {
                        const cells = lines[i].split('|').map(c => c.trim()).filter(c => c);
                        tableRows.push(cells);
                        i++;
                    }

                    let tableHtml = '<table class="slide-table"><thead><tr>';
                    headers.forEach(h => {
                        tableHtml += `<th>${h}</th>`;
                    });
                    tableHtml += '</tr></thead><tbody>';

                    tableRows.forEach(row => {
                        tableHtml += '<tr>';
                        row.forEach(cell => {
                            tableHtml += `<td>${cell}</td>`;
                        });
                        tableHtml += '</tr>';
                    });

                    tableHtml += '</tbody></table>';
                    result.push(tableHtml);
                    continue;
                }
            }

            result.push(line);
            i++;
        }

        return result.join('\n');
    }

    navigateSlide(direction) {
        const newIndex = this.currentSlideIndex + direction;

        if (newIndex >= 0 && newIndex < this.slides.length) {
            this.currentSlideIndex = newIndex;
            this.renderSlide(this.currentSlideIndex);
            this.updateNavigation();
        }
    }

    updateNavigation() {
        if (this.slides.length === 0) {
            this.slideIndicator.textContent = 'No slides';
            this.prevSlideBtn.disabled = true;
            this.nextSlideBtn.disabled = true;
        } else {
            this.slideIndicator.textContent = `Slide ${this.currentSlideIndex + 1} / ${this.slides.length}`;
            this.prevSlideBtn.disabled = this.currentSlideIndex === 0;
            this.nextSlideBtn.disabled = this.currentSlideIndex >= this.slides.length - 1;
        }
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
