# Presentations Directory

This directory contains all presentation files. Each presentation consists of:
- `{name}.md` - Markdown file with slides
- `{name}.json` - Metadata (title, description, etc.)

## Creating a New Presentation

1. Create `myslides.md` with your content
2. Create `myslides.json` with metadata:

```json
{
  "id": "myslides",
  "title": "My Slides",
  "description": "Description here",
  "created": "2025-11-10",
  "modified": "2025-11-10"
}
```

## Docker Volume

Mount this directory as a persistent volume:

```yaml
volumes:
  - ./presentations:/app/presentations
```

This keeps your presentations separate from the application code.
