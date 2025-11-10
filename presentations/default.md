---
layout: presentation.njk
title: My Presentation
eleventyExcludeFromCollections: true
---
# Welcome to Remote Slides

A modern presentation system with remote control

<!-- notes
Welcome everyone! This is the first slide of our presentation.
Remember to introduce yourself and the topic.
-->

---

## Features

- Built with 11ty for fast static generation
- Keyboard navigation (arrows, space, page up/down)
- Remote control from your phone
- Presenter notes visible only to presenter
- Easy deployment on CapRover

<!-- notes
Key features to highlight:
- Show how keyboard navigation works
- Demonstrate the remote control capability
- Mention the presenter view with notes
-->

---

## How to Navigate

### Keyboard Controls
- **Arrow keys** (←/→/↑/↓) - Navigate slides
- **Space** - Next slide
- **Page Up/Down** - Navigate slides
- **Home** - First slide
- **End** - Last slide

<!-- notes
Let the audience know they can follow along if they have access to the presentation URL.
The keyboard shortcuts make navigation intuitive.
-->

---

## Remote Control

1. Open the presenter view on your phone
2. Login with your password
3. Control slides from anywhere
4. View presenter notes privately

<!-- notes
This is the main feature that sets this system apart.
Explain how to access /presenter endpoint.
Default password is "presenter123" but should be changed in production.
-->

---

## Architecture

- **11ty** - Static site generation from Markdown
- **Express** - Web server
- **WebSocket** - Real-time synchronization
- **CapRover** - Easy deployment

<!-- notes
Technical overview for those interested.
All slides are generated at build time for performance.
WebSocket ensures all displays stay in sync.
-->

---

# Thank You!

Questions?

<!-- notes
Open the floor for questions.
Be prepared to demonstrate the remote control feature.
Share the repository link if asked.
-->
