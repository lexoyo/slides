# Managing Presentations

## Directory Structure

All presentations are stored in the `presentations/` directory:

```
presentations/
├── default.md          # Example presentation (markdown)
├── default.json        # Example metadata
├── myslides.md         # Your presentation
├── myslides.json       # Your metadata
└── README.md           # This directory's documentation
```

## Creating a Presentation

### 1. Create Markdown File

Create `presentations/myslides.md`:

```markdown
---
layout: presentation.njk
title: My Presentation
eleventyExcludeFromCollections: true
---
# First Slide

Content here

<!-- notes
Presenter notes
-->

---

# Second Slide

More content
```

### 2. Create Metadata File

Create `presentations/myslides.json`:

```json
{
  "id": "myslides",
  "title": "My Presentation",
  "description": "A great presentation about...",
  "created": "2025-11-10",
  "modified": "2025-11-10"
}
```

### 3. Build and View

```bash
npm run build
npm start
```

Navigate to `http://localhost:3000/editor?id=myslides` to edit.

## Persistent Storage with Docker

### Docker Compose (Recommended)

```yaml
version: '3.8'
services:
  slides:
    build: .
    volumes:
      - ./presentations:/app/presentations
    environment:
      - PRESENTER_PASSWORD=your-password
```

Run with: `docker-compose up`

### Docker CLI

```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/presentations:/app/presentations \
  -e PRESENTER_PASSWORD=your-password \
  remote-slides
```

### CapRover

1. Deploy your app
2. Add a persistent directory: `/app/presentations`
3. Set environment variables

Your presentations will persist across container restarts and redeployments.

## Backup

Since presentations are in a single directory, backup is simple:

```bash
# Backup
tar -czf presentations-backup.tar.gz presentations/

# Restore
tar -xzf presentations-backup.tar.gz
```

## Version Control

Add to `.gitignore` to exclude personal presentations:

```gitignore
presentations/*.md
presentations/*.json
!presentations/default.*
!presentations/README.md
```

Only the example presentation is tracked in git.

## API Endpoints

- `GET /api/presentations` - List all presentations
- `GET /api/slides/content?id=myslides` - Get presentation content
- `POST /api/slides/content` - Save presentation
  ```json
  {
    "id": "myslides",
    "content": "markdown content..."
  }
  ```

## Migration from Old Structure

If you have slides in `src/index.md`:

```bash
cp src/index.md presentations/myslides.md
```

Then create the metadata JSON file.

The system maintains backwards compatibility by also updating `src/index.md` when you save.
