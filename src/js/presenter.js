// Presenter view with remote control
class PresenterController {
    constructor() {
        this.currentIndex = 0;
        this.slides = [];
        this.ws = null;
        this.reconnectInterval = 3000;

        this.init();
    }

    async init() {
        // Get presentation ID from URL
        const params = new URLSearchParams(window.location.search);
        this.presentationId = params.get('id') || 'default';

        // Load slides data
        await this.loadSlides();
        await this.loadTheme();

        // Setup UI elements
        this.setupUI();

        // Setup WebSocket connection
        this.connectWebSocket();

        // Setup controls
        this.setupControls();

        // Restore slide from URL hash or show first slide
        const hash = window.location.hash;
        const slideIndex = hash ? parseInt(hash.substring(1)) : 0;
        this.currentIndex = Math.max(0, Math.min(slideIndex, this.slides.length - 1));

        // Show initial slide
        this.updatePresenterView();
    }

    async loadSlides() {
        try {
            const response = await fetch(`/api/slides/content?id=${this.presentationId}`);

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                const data = await response.json();
                this.parseMarkdownToSlides(data.content);
            } else {
                console.error('Failed to load presentation');
                this.slides = [{
                    content: '<h1>Error: Presentation not found</h1>',
                    notes: '',
                    index: 0
                }];
            }
        } catch (error) {
            console.error('Failed to load slides:', error);
            this.slides = [{
                content: '<h1>Error loading presentation</h1>',
                notes: '',
                index: 0
            }];
        }
    }

    parseMarkdownToSlides(markdownContent) {
        const slideContents = markdownContent.split(/\n---+\n/).filter(s => s.trim());
        this.slides = [];

        slideContents.forEach((slideContent, index) => {
            // Extract notes
            const notesMatch = slideContent.match(/<!--\s*(?:notes\s*)?([\s\S]*?)-->/i);
            const notes = notesMatch ? notesMatch[1].trim() : '';

            // Remove notes from content
            const contentWithoutNotes = slideContent.replace(/<!--\s*(?:notes\s*)?([\s\S]*?)-->/gi, '');

            // Convert markdown to HTML
            const htmlContent = this.markdownToHtml(contentWithoutNotes);

            this.slides.push({
                content: htmlContent,
                notes: notes,
                index: index
            });
        });
    }

    markdownToHtml(markdown) {
        let html = markdown;

        // Tables (must be early)
        html = this.parseMarkdownTables(html);

        // Images (must be before links)
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="eager" style="max-width: 100%; height: auto;">');

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

    async loadTheme() {
        try {
            const response = await fetch(`/api/presentations/${this.presentationId}`);
            if (response.ok) {
                const metadata = await response.json();
                const theme = metadata.theme || 'light';
                this.applyTheme(theme);
            }
        } catch (error) {
            console.error('Error loading theme:', error);
        }
    }

    applyTheme(theme) {
        // Update preview styles to match theme
        const previews = document.querySelectorAll('.slide-preview');
        previews.forEach(preview => {
            if (theme === 'dark') {
                preview.style.background = '#1a1a1a';
            } else {
                preview.style.background = '#ffffff';
            }
        });
    }

    parseSlidesFromDOM() {
        // This is a fallback method
        const slides = [];
        document.querySelectorAll('.slide').forEach((slide, index) => {
            const content = slide.querySelector('.slide-content')?.innerHTML || '';
            const notes = slide.querySelector('.presenter-notes')?.textContent || '';
            slides.push({ content, notes, index });
        });
        return slides;
    }

    setupUI() {
        this.currentSlideEl = document.getElementById('current-slide');
        this.nextSlideEl = document.getElementById('next-slide');
        this.notesEl = document.getElementById('notes-content');
        this.counterEl = document.getElementById('slide-counter');
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');

        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
    }

    setupControls() {
        this.prevBtn.addEventListener('click', () => this.previousSlide());
        this.nextBtn.addEventListener('click', () => this.nextSlide());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                case 'PageDown':
                    e.preventDefault();
                    this.nextSlide();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                case 'PageUp':
                    e.preventDefault();
                    this.previousSlide();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToSlide(0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToSlide(this.slides.length - 1);
                    break;
            }
        });

        // Touch/swipe navigation
        this.setupTouchNavigation();
    }

    setupTouchNavigation() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        const minSwipeDistance = 50;

        const slidesContainer = document.querySelector('.presenter-main');
        if (slidesContainer) {
            slidesContainer.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
                touchStartY = e.changedTouches[0].screenY;
            }, { passive: true });

            slidesContainer.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                touchEndY = e.changedTouches[0].screenY;
                this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY, minSwipeDistance);
            }, { passive: true });
        }
    }

    handleSwipe(startX, startY, endX, endY, minDistance) {
        const deltaX = endX - startX;
        const deltaY = endY - startY;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (Math.abs(deltaX) > minDistance) {
                if (deltaX > 0) {
                    this.previousSlide();
                } else {
                    this.nextSlide();
                }
            }
        } else {
            if (Math.abs(deltaY) > minDistance) {
                if (deltaY > 0) {
                    this.previousSlide();
                } else {
                    this.nextSlide();
                }
            }
        }
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        this.updateConnectionStatus('connecting');

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.updateConnectionStatus('connected');

                // Register as presenter
                this.ws.send(JSON.stringify({
                    type: 'register',
                    role: 'presenter'
                }));
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'navigate') {
                    this.goToSlide(data.slideIndex, false);
                }
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected, reconnecting...');
                this.updateConnectionStatus('disconnected');
                setTimeout(() => this.connectWebSocket(), this.reconnectInterval);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('disconnected');
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.updateConnectionStatus('disconnected');
            setTimeout(() => this.connectWebSocket(), this.reconnectInterval);
        }
    }

    updateConnectionStatus(status) {
        this.statusIndicator.className = status;

        const statusMessages = {
            'connecting': 'Connecting...',
            'connected': 'Connected',
            'disconnected': 'Disconnected'
        };

        this.statusText.textContent = statusMessages[status] || 'Unknown';
    }

    updatePresenterView() {
        if (this.slides.length === 0) return;

        // Update current slide iframe
        const currentSlide = this.slides[this.currentIndex];
        if (this.currentSlideEl) {
            // Force reload by adding timestamp to avoid cache
            const timestamp = Date.now();
            this.currentSlideEl.src = `/?id=${this.presentationId}&t=${timestamp}#${this.currentIndex}`;
        }

        // Update next slide iframe
        const nextSlide = this.slides[this.currentIndex + 1];
        if (this.nextSlideEl) {
            if (nextSlide) {
                const timestamp = Date.now();
                this.nextSlideEl.src = `/?id=${this.presentationId}&t=${timestamp}#${this.currentIndex + 1}`;
            } else {
                // Show empty slide for end of presentation
                this.nextSlideEl.src = 'about:blank';
            }
        }

        // Update notes (convert markdown to HTML)
        if (currentSlide && this.notesEl) {
            if (currentSlide.notes) {
                this.notesEl.innerHTML = this.markdownToHtml(currentSlide.notes);
            } else {
                this.notesEl.innerHTML = '<p style="opacity: 0.6;">No notes for this slide</p>';
            }
        }

        // Update counter
        if (this.counterEl) {
            this.counterEl.textContent = `${this.currentIndex + 1} / ${this.slides.length}`;
        }

        // Update button states
        this.prevBtn.disabled = this.currentIndex === 0;
        this.nextBtn.disabled = this.currentIndex >= this.slides.length - 1;
    }

    nextSlide() {
        if (this.currentIndex < this.slides.length - 1) {
            this.goToSlide(this.currentIndex + 1);
        }
    }

    previousSlide() {
        if (this.currentIndex > 0) {
            this.goToSlide(this.currentIndex - 1);
        }
    }

    goToSlide(index, broadcast = true) {
        if (index >= 0 && index < this.slides.length) {
            this.currentIndex = index;
            this.updatePresenterView();

            // Update URL hash
            window.location.hash = index;

            // Broadcast to WebSocket
            if (broadcast && this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'navigate',
                    slideIndex: index
                }));
            }
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new PresenterController();
    });
} else {
    new PresenterController();
}
