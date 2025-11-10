// Slide navigation with keyboard controls and WebSocket sync
class SlideController {
    constructor() {
        this.slides = document.querySelectorAll('.slide');
        this.currentIndex = 0;
        this.ws = null;
        this.reconnectInterval = 3000;

        this.init();
    }

    init() {
        if (this.slides.length === 0) return;

        // Show first slide
        this.showSlide(0);

        // Setup keyboard navigation
        this.setupKeyboardNavigation();

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
        this.slides.forEach((slide, i) => {
            if (i === index) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });

        this.currentIndex = index;
        this.updateSlideNumber();
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
        const slideNumber = document.querySelector('.slide-number');
        if (slideNumber) {
            slideNumber.textContent = `${this.currentIndex + 1} / ${this.slides.length}`;
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
