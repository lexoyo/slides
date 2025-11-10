# Remote Slides

A modern presentation system with dual projection and remote control capabilities. Built with 11ty, Express, and WebSocket.

## Features

- **Static Site Generation**: Uses 11ty to build slides from Markdown files
- **Web-Based Editor**: Edit slides directly in your browser with live preview
- **Keyboard Navigation**: Navigate slides using arrow keys, space, page up/down, home, and end
- **Touch/Swipe Support**: Navigate on mobile devices with swipe gestures
- **Remote Control**: Control presentations from your phone via a presenter view
- **Presenter Notes**: Private notes visible only in the presenter view
- **Real-time Sync**: WebSocket-based synchronization between displays and presenters
- **Easy Deployment**: Optimized for CapRover deployment
- **Default Theme**: Professional gradient theme with responsive design

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

This starts both the 11ty dev server and the WebSocket server.

- Presentation: http://localhost:3000
- Presenter View: http://localhost:3000/presenter
- Slide Editor: http://localhost:3000/editor

### Production Build

```bash
npm run build
npm start
```

## Creating Slides

### Option 1: Using the Web Editor (Recommended)

1. Navigate to http://localhost:3000/editor
2. Login with your presenter password
3. Edit slides in the left panel
4. See live preview on the right
5. Click "Save" (or press Ctrl/Cmd+S)
6. Rebuild: `npm run build`

### Option 2: Edit Files Directly

Create or edit `src/index.md` directly. Use `---` to separate slides.

### Example Slide with Notes

```markdown
# My Slide Title

Content goes here

<!--
These are presenter notes.
They will only be visible in the presenter view.
Markdown is supported in notes.
-->

---

# Next Slide

More content
```

### Special Slide Layouts

You can use special directives at the beginning of a slide for advanced layouts:

**Background Image:**
```markdown
bg: /images/background.jpg

# My Slide Title
Content appears over the background image
```

**Image on Left, Text on Right:**
```markdown
left: /images/photo.jpg

# My Title
- Point 1
- Point 2
```

**Image on Right, Text on Left:**
```markdown
right: /images/photo.jpg

# My Title
Content appears on the left
```

**Note**: All directives must be at the very beginning of the slide (before any content).

### Keyboard Controls

**Public Display:**
- Arrow keys (←/→/↑/↓): Navigate slides
- Space: Next slide
- Page Up/Down: Navigate slides
- Home: First slide
- End: Last slide

**Touch/Swipe Controls (Mobile):**
- Swipe left/up: Next slide
- Swipe right/down: Previous slide

**Presenter View:**
- Same keyboard shortcuts as public display
- Touch/swipe support on slide previews
- On-screen buttons for navigation
- Shows current slide, next slide, and presenter notes

## Presentations Storage

All presentations are stored in the `presentations/` directory. This directory can be mounted as a persistent volume in Docker/CapRover.

See [PRESENTATIONS.md](PRESENTATIONS.md) for detailed documentation on managing presentations.

### Quick Overview

- Each presentation: `presentations/name.md` + `presentations/name.json`
- Docker volume: `-v ./presentations:/app/presentations`
- Survives container restarts and redeployments

## Deployment on CapRover

### Prerequisites

1. CapRover installed and running
2. CapRover CLI installed: `npm install -g caprover`

### Deployment Steps

1. Initialize your app in CapRover:
   ```bash
   caprover deploy
   ```

2. Set environment variables in CapRover dashboard:
   - `SESSION_SECRET`: A secure random string
   - `PRESENTER_PASSWORD`: Password for presenter access
   - `NODE_ENV`: production

3. The app will build automatically and be available at your CapRover domain

### Environment Variables

- `PORT`: Server port (default: 3000)
- `SESSION_SECRET`: Secret for session encryption (required in production)
- `PRESENTER_PASSWORD`: Password to access presenter view (default: presenter123)
- `NODE_ENV`: Set to 'production' in production

## Project Structure

```
.
├── src/
│   ├── _layouts/          # 11ty layouts
│   │   ├── base.njk       # Base HTML layout
│   │   ├── presentation.njk  # Slide presentation layout
│   │   ├── presenter.njk  # Presenter view layout
│   │   └── editor.njk     # Editor layout
│   ├── css/               # Stylesheets
│   │   ├── theme.css      # Main presentation theme
│   │   ├── presenter.css  # Presenter view styles
│   │   └── editor.css     # Editor styles
│   ├── js/                # JavaScript
│   │   ├── slides.js      # Slide navigation and WebSocket
│   │   ├── presenter.js   # Presenter view controller
│   │   └── editor.js      # Editor with live preview
│   ├── slides/            # Markdown slides (add your own)
│   └── index.md           # Main presentation file
├── server.js              # Express + WebSocket server + API
├── .eleventy.js           # 11ty configuration
├── Dockerfile             # Docker configuration
├── captain-definition     # CapRover configuration
└── package.json           # Dependencies and scripts
```

## Customization

### Theme

Edit `src/css/theme.css` to customize:
- Colors and gradients
- Fonts and typography
- Slide transitions
- Layout and spacing

### Layout

Create new layouts in `src/_layouts/` for different slide styles.

## Authentication

The presenter view is protected by password authentication. Default password is `presenter123`.

**Important**: Change the `PRESENTER_PASSWORD` environment variable in production!

## WebSocket Synchronization

The system uses WebSocket to synchronize slide navigation:
- All display clients receive navigation updates
- Presenter view controls send updates to all displays
- Automatic reconnection on connection loss

## Browser Support

- Modern browsers with ES6+ support
- WebSocket support required
- Tested on Chrome, Firefox, Safari, and Edge

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
