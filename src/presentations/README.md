---
permalink: false
eleventyExcludeFromCollections: true
---
# Presentations Directory

This directory contains all presentation files. Each presentation consists of:
- `{name}.md` - Markdown file with slides and front matter metadata

## Creating a New Presentation

1. Create `myslides.md` with front matter and content:

```markdown
---
layout: presentation.njk
title: My Slides
description: Description here
theme: light
created: '2025-11-10'
modified: '2025-11-10'
eleventyExcludeFromCollections: true
---
# Welcome

Your first slide...

---

# Second Slide

More content here...
```

## Docker Volume

Mount this directory as a persistent volume:

```yaml
volumes:
  - ./presentations:/app/presentations
```

This keeps your presentations separate from the application code.
