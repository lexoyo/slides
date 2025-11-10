# Slide Editor Guide

The built-in web editor provides a convenient way to edit your slides directly in the browser with live preview.

## Accessing the Editor

1. Start the server: `npm start`
2. Navigate to: http://localhost:3000/editor
3. Login with your presenter password (default: `presenter123`)

## Editor Interface

### Layout

The editor has a split-screen layout:
- **Left Panel**: Markdown editor with syntax highlighting
- **Right Panel**: Live preview showing how your slides will look

### Features

#### 1. Markdown Editor
- Full-featured text editor
- Syntax highlighting for markdown
- Auto-save indication
- Line numbers and helpful text

#### 2. Live Preview
- Real-time preview as you type (300ms debounce)
- Shows slides with the actual theme applied
- Navigate between slides to preview each one
- See how slides will look on the actual presentation

#### 3. Slide Navigation
- Use arrow buttons to navigate between slides in preview
- Shows current slide number (e.g., "Slide 2 / 5")
- Previous/Next buttons enable/disable based on position

#### 4. Toolbar Actions
- **Save**: Save changes (or use Ctrl/Cmd+S)
- **Toggle Preview**: Show/hide preview on mobile
- **View Slides**: Open presentation in new tab
- **Presenter**: Go to presenter view
- **Logout**: Return to login screen

## Writing Slides

### Slide Separator

Use three or more dashes on their own line to separate slides:

```markdown
# First Slide

Content here

---

# Second Slide

More content
```

### Presenter Notes

Add private notes that only appear in presenter view:

```markdown
# My Slide

Public content

<!-- notes
These notes will only be visible in the presenter view.
They won't appear on the main projection.
-->
```

### Markdown Syntax

The editor supports standard markdown:

- `# Heading 1` - Main title
- `## Heading 2` - Subtitle
- `### Heading 3` - Section heading
- `**bold**` - Bold text
- `*italic*` - Italic text
- `[link](url)` - Links
- `` `code` `` - Inline code
- ` ```code block``` ` - Code blocks
- `- item` - Unordered list
- `1. item` - Ordered list

## Workflow

### Recommended Workflow

1. **Edit**: Make changes in the editor
2. **Preview**: Check how slides look in live preview
3. **Save**: Click Save or press Ctrl/Cmd+S
4. **Rebuild**: Run `npm run build` in terminal
5. **Present**: Refresh your presentation browser

### Keyboard Shortcuts

- **Ctrl/Cmd+S**: Save changes
- **Arrow keys**: Navigate preview slides (when focused on preview)

## Tips

### Auto-save
The editor doesn't auto-save. Always click "Save" or use Ctrl/Cmd+S before rebuilding.

### Preview Accuracy
The preview uses a lightweight markdown parser. Complex HTML or custom styling may look slightly different. Always check the actual presentation after rebuilding.

### Mobile Usage
On mobile devices:
- The editor shows only the text editor by default
- Click "Toggle Preview" to switch between editor and preview
- All editing features work on mobile

### Collaboration
Multiple users can access the editor, but:
- Changes are saved to the same file
- No conflict resolution - last save wins
- Consider using version control (git) for collaboration

## Troubleshooting

### Changes Not Showing
- Did you click "Save"?
- Did you run `npm run build`?
- Did you refresh the presentation page?

### Can't Access Editor
- Make sure you're logged in
- Check that the server is running
- Verify the URL is correct: `/editor`

### Preview Not Updating
- Check browser console for errors
- Try refreshing the page
- Check that JavaScript is enabled

### Permission Errors on Save
- Verify file permissions on `src/index.md`
- Check that the server has write access
- Look at server logs for error details

## Advanced

### Custom Frontmatter
The editor preserves frontmatter at the top of `index.md`:

```markdown
---
layout: presentation.njk
title: My Presentation
eleventyExcludeFromCollections: true
---
```

You can edit the title and other frontmatter directly in the file if needed.

### API Endpoints
The editor uses these API endpoints:
- `GET /api/slides/content` - Load markdown content
- `POST /api/slides/content` - Save markdown content

Both endpoints require authentication.

## Security

- Editor access is protected by the same password as presenter view
- Changes are written to the server filesystem
- Only authenticated users can edit slides
- Use HTTPS in production to protect credentials

## Future Enhancements

Potential features for future versions:
- Auto-rebuild on save
- Multiple presentation files
- Version history
- Real-time collaboration
- Drag-and-drop images
- Spell checking
