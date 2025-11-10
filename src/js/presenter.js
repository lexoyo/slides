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
        // Load slides data
        await this.loadSlides();

        // Setup UI elements
        this.setupUI();

        // Setup WebSocket connection
        this.connectWebSocket();

        // Setup controls
        this.setupControls();

        // Show first slide
        this.updatePresenterView();
    }

    async loadSlides() {
        try {
            const response = await fetch('/slides-data.json');
            if (response.ok) {
                const data = await response.json();
                this.slides = data.slides || [];
            } else {
                // Fallback: parse from DOM if JSON endpoint doesn't exist
                this.slides = this.parseSlidesFromDOM();
            }
        } catch (error) {
            console.error('Failed to load slides:', error);
            this.slides = this.parseSlidesFromDOM();
        }
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

        // Update current slide
        const currentSlide = this.slides[this.currentIndex];
        if (currentSlide && this.currentSlideEl) {
            this.currentSlideEl.innerHTML = `<div class="slide-content"><div>${currentSlide.content}</div></div>`;
        }

        // Update next slide
        const nextSlide = this.slides[this.currentIndex + 1];
        if (nextSlide && this.nextSlideEl) {
            this.nextSlideEl.innerHTML = `<div class="slide-content"><div>${nextSlide.content}</div></div>`;
        } else if (this.nextSlideEl) {
            this.nextSlideEl.innerHTML = '<div class="slide-content"><div style="opacity: 0.5;">End of presentation</div></div>';
        }

        // Update notes
        if (currentSlide && this.notesEl) {
            this.notesEl.textContent = currentSlide.notes || 'No notes for this slide';
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
