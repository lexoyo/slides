// Slide navigation with keyboard controls and WebSocket sync
class SlideController {
    constructor() {
        this.slides = null;
        this.currentIndex = 0;
        this.ws = null;
        this.reconnectInterval = 3000;
        this.presentationId = null;
        this.defaultTheme = 'light'; // Store the presentation's default theme

        this.init();
    }

    async init() {
        // Check if we need to load presentation dynamically
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get('id');

        if (urlId) {
            // Load presentation from API
            this.presentationId = urlId;
            await this.loadPresentation();
            await this.loadTheme();
        } else {
            // For static presentations, try to get default theme from page data or use 'light'
            const metaTheme = document.querySelector('meta[name="presentation-theme"]');
            this.defaultTheme = metaTheme ? metaTheme.content : 'light';
        }

        // Get slides from DOM (either pre-rendered or dynamically loaded)
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

    async loadPresentation() {
        try {
            const response = await fetch(`/api/slides/content?id=${this.presentationId}`);

            if (!response.ok) {
                console.error('Failed to load presentation');
                const slidesContainer = document.querySelector('.slides');
                if (slidesContainer) {
                    slidesContainer.innerHTML = '<section class="slide active"><div class="slide-content"><h1>Error: Presentation not found</h1></div></section>';
                }
                return;
            }

            const data = await response.json();
            this.renderSlides(data.content);
        } catch (error) {
            console.error('Error loading presentation:', error);
            const slidesContainer = document.querySelector('.slides');
            if (slidesContainer) {
                slidesContainer.innerHTML = '<section class="slide active"><div class="slide-content"><h1>Error loading presentation</h1></div></section>';
            }
        }
    }

    async loadTheme() {
        try {
            const response = await fetch(`/api/presentations/${this.presentationId}`);
            if (response.ok) {
                const metadata = await response.json();
                const theme = metadata.theme || 'light';
                this.defaultTheme = theme; // Store the presentation's default theme
                this.applyTheme(theme);

                // Update page title if title is provided
                if (metadata.title) {
                    document.title = metadata.title;

                    // Update presentation header title
                    const titleElement = document.querySelector('.presentation-title .title-text');
                    if (titleElement) {
                        titleElement.textContent = metadata.title;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading theme:', error);
        }
    }

    applyTheme(theme) {
        // Remove existing theme link if any
        const existingTheme = document.getElementById('theme-css');
        if (existingTheme) {
            existingTheme.remove();
        }

        // Add new theme link
        const link = document.createElement('link');
        link.id = 'theme-css';
        link.rel = 'stylesheet';
        link.href = `/css/themes/${theme}.css`;
        document.head.appendChild(link);
    }

    renderSlides(markdownContent) {
        const slidesContainer = document.querySelector('.slides');
        if (!slidesContainer) return;

        // Split content into slides
        const slideContents = markdownContent.split(/\n---+\n/).filter(s => s.trim());

        // Clear existing slides
        slidesContainer.innerHTML = '';

        // Render each slide
        slideContents.forEach((slideContent, index) => {
            const slide = document.createElement('section');
            slide.className = 'slide';
            slide.setAttribute('data-slide-index', index);

            // Remove presenter notes (if any)
            const contentWithoutNotes = slideContent.replace(/<!--\s*(?:notes\s*)?([\s\S]*?)-->/gi, '');

            // Parse special directives
            const { content, bgImage, layoutImage, layoutPosition, theme, hideTitle } = this.parseSlideDirectives(contentWithoutNotes);

            // Store theme on slide element if specified
            if (theme) {
                slide.setAttribute('data-theme', theme);
            }

            // Store hideTitle on slide element if specified
            if (hideTitle) {
                slide.setAttribute('data-hide-title', 'true');
            }

            // Apply background image if specified
            if (bgImage) {
                slide.style.backgroundImage = `url(${bgImage})`;
                slide.style.backgroundSize = 'contain';
                slide.style.backgroundPosition = 'center';
                slide.style.backgroundRepeat = 'no-repeat';
            }

            const slideDiv = document.createElement('div');
            slideDiv.className = 'slide-content';

            // Apply layout if image layout is specified
            if (layoutImage) {
                slideDiv.classList.add('split-layout');
                const imageDiv = document.createElement('div');
                imageDiv.className = `split-image split-image-${layoutPosition}`;
                imageDiv.innerHTML = `<img src="${layoutImage}" alt="" loading="eager">`;

                const textDiv = document.createElement('div');
                textDiv.className = `split-text split-text-${layoutPosition}`;
                textDiv.innerHTML = this.markdownToHtml(content);

                if (layoutPosition === 'left') {
                    slideDiv.appendChild(imageDiv);
                    slideDiv.appendChild(textDiv);
                } else {
                    slideDiv.appendChild(textDiv);
                    slideDiv.appendChild(imageDiv);
                }
            } else {
                slideDiv.innerHTML = this.markdownToHtml(content);
            }

            slide.appendChild(slideDiv);
            slidesContainer.appendChild(slide);
        });
    }

    parseSlideDirectives(content) {
        let bgImage = null;
        let layoutImage = null;
        let layoutPosition = null;
        let theme = null;
        let hideTitle = false;
        let cleanContent = content;

        // Check for theme: directive
        const themeMatch = content.match(/^theme:\s*(.+)$/m);
        if (themeMatch) {
            theme = themeMatch[1].trim();
            cleanContent = cleanContent.replace(/^theme:\s*.+$\n?/m, '');
        }

        // Check for title: directive
        const titleMatch = content.match(/^title:\s*(.+)$/m);
        if (titleMatch) {
            hideTitle = titleMatch[1].trim() === 'false';
            cleanContent = cleanContent.replace(/^title:\s*.+$\n?/m, '');
        }

        // Check for bg: directive
        const bgMatch = content.match(/^bg:\s*(.+)$/m);
        if (bgMatch) {
            bgImage = bgMatch[1].trim();
            cleanContent = cleanContent.replace(/^bg:\s*.+$\n?/m, '');
        }

        // Check for left: directive
        const leftMatch = content.match(/^left:\s*(.+)$/m);
        if (leftMatch) {
            layoutImage = leftMatch[1].trim();
            layoutPosition = 'left';
            cleanContent = cleanContent.replace(/^left:\s*.+$\n?/m, '');
        }

        // Check for right: directive
        const rightMatch = content.match(/^right:\s*(.+)$/m);
        if (rightMatch) {
            layoutImage = rightMatch[1].trim();
            layoutPosition = 'right';
            cleanContent = cleanContent.replace(/^right:\s*.+$\n?/m, '');
        }

        return {
            content: cleanContent.trim(),
            bgImage,
            layoutImage,
            layoutPosition,
            theme,
            hideTitle
        };
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

            // Check if this line looks like a table header (contains |)
            if (line.includes('|') && i + 1 < lines.length) {
                const nextLine = lines[i + 1];

                // Check if next line is a separator (contains | and -)
                if (nextLine.includes('|') && nextLine.includes('-')) {
                    // Parse the table
                    const headers = line.split('|').map(h => h.trim()).filter(h => h);
                    let tableRows = [];

                    i += 2; // Skip header and separator

                    // Collect table rows
                    while (i < lines.length && lines[i].includes('|')) {
                        const cells = lines[i].split('|').map(c => c.trim()).filter(c => c);
                        tableRows.push(cells);
                        i++;
                    }

                    // Generate HTML table
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

                // Apply theme: if slide has theme directive, use it; otherwise revert to default
                const slideTheme = slide.getAttribute('data-theme');
                if (slideTheme) {
                    this.applyTheme(slideTheme);
                } else {
                    // Revert to presentation's default theme
                    this.applyTheme(this.defaultTheme);
                }

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
