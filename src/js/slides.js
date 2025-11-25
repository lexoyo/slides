// Slide navigation with keyboard controls and WebSocket sync
class SlideController {
    constructor() {
        this.slides = null;
        this.currentIndex = 0;
        this.ws = null;
        this.reconnectInterval = 3000;

        this.init();
    }

    async init() {
        // Get slides from pre-rendered DOM
        this.slides = document.querySelectorAll('.slide');

        if (this.slides.length === 0) {
            console.error('No slides found');
            return;
        }

        // Restore slide from URL hash or show first slide
        const hash = window.location.hash;
        const slideIndex = hash ? parseInt(hash.substring(1)) : 0;

        this.showSlide(slideIndex);

        // Setup keyboard navigation
        this.setupKeyboardNavigation();

        // Setup touch/swipe navigation
        this.setupTouchNavigation();

        // Setup WebSocket connection
        this.connectWebSocket();

        // Update slide number
        this.updateSlideNumber();
    }


    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                case 'PageDown':
                case ' ':
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
    }

    setupTouchNavigation() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        const minSwipeDistance = 50; // Minimum distance for a swipe

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe();
        }, { passive: true });

        this.handleSwipe = () => {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;

            // Check if horizontal swipe is more significant than vertical
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (Math.abs(deltaX) > minSwipeDistance) {
                    if (deltaX > 0) {
                        // Swipe right - previous slide
                        this.previousSlide();
                    } else {
                        // Swipe left - next slide
                        this.nextSlide();
                    }
                }
            } else {
                // Vertical swipe
                if (Math.abs(deltaY) > minSwipeDistance) {
                    if (deltaY > 0) {
                        // Swipe down - previous slide
                        this.previousSlide();
                    } else {
                        // Swipe up - next slide
                        this.nextSlide();
                    }
                }
            }
        };
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                // Register as projection display
                this.ws.send(JSON.stringify({
                    type: 'register',
                    role: 'display'
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
                setTimeout(() => this.connectWebSocket(), this.reconnectInterval);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            setTimeout(() => this.connectWebSocket(), this.reconnectInterval);
        }
    }

    showSlide(index) {
        // Validate index
        if (index < 0 || index >= this.slides.length) {
            index = 0;
        }

        this.slides.forEach((slide, i) => {
            if (i === index) {
                slide.classList.add('active');

                // Handle title visibility: hide or show header based on data-hide-title attribute
                const hideTitle = slide.getAttribute('data-hide-title') === 'true';
                const header = document.querySelector('.presentation-header');
                if (header) {
                    if (hideTitle) {
                        header.style.display = 'none';
                    } else {
                        header.style.display = '';
                    }
                }
            } else {
                slide.classList.remove('active');
            }
        });

        this.currentIndex = index;
        this.updateSlideNumber();

        // Update URL hash
        window.location.hash = index;
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
            this.showSlide(index);

            // Broadcast to WebSocket if this is a local navigation
            if (broadcast && this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'navigate',
                    slideIndex: index
                }));
            }
        }
    }

    updateSlideNumber() {
        // Update the counter in the header
        const slideCounter = document.querySelector('.slide-counter');
        if (slideCounter) {
            slideCounter.textContent = `${this.currentIndex + 1} / ${this.slides.length}`;
        }

        // Show/hide navigation arrows based on position
        const navArrows = document.querySelectorAll('.nav-arrow');
        if (navArrows.length === 2) {
            // Hide left arrow on first slide
            navArrows[0].style.visibility = this.currentIndex === 0 ? 'hidden' : 'visible';
            // Hide right arrow on last slide
            navArrows[1].style.visibility = this.currentIndex === this.slides.length - 1 ? 'hidden' : 'visible';
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new SlideController();
    });
} else {
    new SlideController();
}
