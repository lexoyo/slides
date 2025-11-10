# Quick Start Guide

## Installation (30 seconds)

```bash
npm install
npm run build
npm start
```

## Access

- **Slides**: http://localhost:3000
- **Remote Control**: http://localhost:3000/presenter
  - Password: `presenter123`

## How to Use

### 1. Present on Main Display
- Open http://localhost:3000 on your projector/screen
- Use keyboard arrows or space to navigate

### 2. Control from Phone
- Open http://localhost:3000/presenter on your phone
- Login with password
- Navigate slides - the main display will follow

### 3. Edit Slides
- Edit `src/index.md`
- Separate slides with `---`
- Add notes with HTML comments:

```markdown
# Slide Title

Content

<!-- notes
Private presenter notes here
-->

---

# Next Slide
```

### 4. Rebuild
```bash
npm run build
npm start
```

## Deploy to CapRover

```bash
caprover deploy
```

Set environment variables in CapRover:
- `PRESENTER_PASSWORD`: your-password
- `SESSION_SECRET`: random-string
- `NODE_ENV`: production

Done!
