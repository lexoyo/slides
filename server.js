const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret-in-production';
const PRESENTER_PASSWORD = process.env.PRESENTER_PASSWORD || 'presenter123';

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files from _site (11ty output)
app.use(express.static(path.join(__dirname, '_site')));

// Serve uploaded assets
app.use('/assets', express.static(path.join(__dirname, 'presentations', 'assets')));

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const assetsDir = path.join(__dirname, 'presentations', 'assets');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        cb(null, assetsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// WebSocket clients tracking
const clients = {
    displays: new Set(),
    presenters: new Set()
};

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch(data.type) {
                case 'register':
                    handleRegistration(ws, data);
                    break;

                case 'navigate':
                    handleNavigation(ws, data);
                    break;

                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    ws.on('close', () => {
        // Remove from both sets (client could be in either)
        clients.displays.delete(ws);
        clients.presenters.delete(ws);
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function handleRegistration(ws, data) {
    if (data.role === 'display') {
        clients.displays.add(ws);
        ws.role = 'display';
        console.log('Display registered');
    } else if (data.role === 'presenter') {
        clients.presenters.add(ws);
        ws.role = 'presenter';
        console.log('Presenter registered');
    }
}

function handleNavigation(ws, data) {
    const message = JSON.stringify({
        type: 'navigate',
        slideIndex: data.slideIndex
    });

    // Broadcast to all displays
    clients.displays.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client !== ws) {
            client.send(message);
        }
    });

    // Broadcast to all presenters
    clients.presenters.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client !== ws) {
            client.send(message);
        }
    });
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.authenticated) {
        next();
    } else {
        // Check if it's an API request
        if (req.path.startsWith('/api/')) {
            res.status(401).json({ error: 'Not authenticated' });
        } else {
            res.redirect('/login');
        }
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '_site', 'index.html'));
});

app.get('/presenter', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '_site', 'presenter', 'index.html'));
});

app.get('/editor', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '_site', 'editor', 'index.html'));
});

app.get('/admin', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '_site', 'admin', 'index.html'));
});

app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Presenter Login</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    padding: 1rem;
                }
                .login-container {
                    background: white;
                    padding: 2rem;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    width: 100%;
                    max-width: 400px;
                }
                h1 {
                    color: #333;
                    margin-bottom: 1.5rem;
                    text-align: center;
                }
                .form-group {
                    margin-bottom: 1.5rem;
                }
                label {
                    display: block;
                    margin-bottom: 0.5rem;
                    color: #555;
                    font-weight: 600;
                }
                input[type="password"] {
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid #e0e0e0;
                    border-radius: 6px;
                    font-size: 1rem;
                    transition: border-color 0.3s;
                }
                input[type="password"]:focus {
                    outline: none;
                    border-color: #667eea;
                }
                button {
                    width: 100%;
                    padding: 0.75rem;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.3s;
                }
                button:hover {
                    background: #5a67d8;
                }
                .error {
                    color: #e74c3c;
                    margin-bottom: 1rem;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="login-container">
                <h1>Presenter Login</h1>
                ${req.query.error ? '<p class="error">Invalid password</p>' : ''}
                <form method="POST" action="/login">
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required autofocus>
                    </div>
                    <button type="submit">Login</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    const { password } = req.body;

    if (password === PRESENTER_PASSWORD) {
        req.session.authenticated = true;
        res.redirect('/admin');
    } else {
        res.redirect('/login?error=1');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// API endpoint to upload images
app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const imageUrl = `/assets/${req.file.filename}`;
        res.json({
            success: true,
            url: imageUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// API endpoint to list all presentations
app.get('/api/presentations', requireAuth, (req, res) => {
    try {
        const presentationsDir = path.join(__dirname, 'presentations');
        const files = fs.readdirSync(presentationsDir);

        const presentations = files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const jsonPath = path.join(presentationsDir, file);
                const metadata = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                return metadata;
            });

        res.json({ presentations });
    } catch (error) {
        console.error('Error listing presentations:', error);
        res.status(500).json({ error: 'Failed to list presentations' });
    }
});

// API endpoint to get markdown content for editor
app.get('/api/slides/content', requireAuth, (req, res) => {
    try {
        const presentationId = req.query.id || 'default';
        const mdPath = path.join(__dirname, 'presentations', `${presentationId}.md`);
        console.log('Loading markdown from:', mdPath);
        console.log('File exists:', fs.existsSync(mdPath));

        if (fs.existsSync(mdPath)) {
            const content = fs.readFileSync(mdPath, 'utf8');
            console.log('File content length:', content.length);

            // Remove frontmatter
            const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n/, '');
            console.log('Content after removing frontmatter:', contentWithoutFrontmatter.substring(0, 100));

            res.json({ content: contentWithoutFrontmatter });
        } else {
            console.log('File not found, returning empty content');
            res.json({ content: '' });
        }
    } catch (error) {
        console.error('Error reading markdown file:', error);
        res.status(500).json({ error: 'Failed to read markdown file' });
    }
});

// API endpoint to create new presentation
app.post('/api/presentations', requireAuth, (req, res) => {
    try {
        const { id, title, description } = req.body;

        if (!id || !/^[a-z0-9-]+$/.test(id)) {
            return res.status(400).json({ error: 'Invalid presentation ID. Use lowercase letters, numbers, and hyphens only.' });
        }

        const mdPath = path.join(__dirname, 'presentations', `${id}.md`);
        const jsonPath = path.join(__dirname, 'presentations', `${id}.json`);

        if (fs.existsSync(mdPath) || fs.existsSync(jsonPath)) {
            return res.status(409).json({ error: 'Presentation already exists' });
        }

        // Create metadata
        const metadata = {
            id,
            title: title || 'New Presentation',
            description: description || '',
            created: new Date().toISOString().split('T')[0],
            modified: new Date().toISOString().split('T')[0]
        };

        // Create markdown file
        const content = `---
layout: presentation.njk
title: ${metadata.title}
eleventyExcludeFromCollections: true
---
# ${metadata.title}

Start your presentation here...

---

# Second Slide

Add more content
`;

        fs.writeFileSync(mdPath, content, 'utf8');
        fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2), 'utf8');

        res.json({ success: true, message: 'Presentation created', presentation: metadata });
    } catch (error) {
        console.error('Error creating presentation:', error);
        res.status(500).json({ error: 'Failed to create presentation' });
    }
});

// API endpoint to delete presentation
app.delete('/api/presentations/:id', requireAuth, (req, res) => {
    try {
        const { id } = req.params;

        if (id === 'default') {
            return res.status(403).json({ error: 'Cannot delete default presentation' });
        }

        const mdPath = path.join(__dirname, 'presentations', `${id}.md`);
        const jsonPath = path.join(__dirname, 'presentations', `${id}.json`);

        if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);
        if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);

        res.json({ success: true, message: 'Presentation deleted' });
    } catch (error) {
        console.error('Error deleting presentation:', error);
        res.status(500).json({ error: 'Failed to delete presentation' });
    }
});

// API endpoint to update presentation metadata
app.patch('/api/presentations/:id', requireAuth, (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, layout } = req.body;

        const jsonPath = path.join(__dirname, 'presentations', `${id}.json`);
        const mdPath = path.join(__dirname, 'presentations', `${id}.md`);

        if (!fs.existsSync(jsonPath)) {
            return res.status(404).json({ error: 'Presentation not found' });
        }

        // Update metadata
        const metadata = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (title) metadata.title = title;
        if (description !== undefined) metadata.description = description;
        metadata.modified = new Date().toISOString().split('T')[0];
        fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2), 'utf8');

        // Update frontmatter in markdown if title or layout changed
        if ((title || layout) && fs.existsSync(mdPath)) {
            let content = fs.readFileSync(mdPath, 'utf8');
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);

            if (frontmatterMatch) {
                let frontmatter = frontmatterMatch[1];
                if (title) {
                    frontmatter = frontmatter.replace(/^title:.*$/m, `title: ${title}`);
                }
                if (layout) {
                    frontmatter = frontmatter.replace(/^layout:.*$/m, `layout: ${layout}`);
                }
                content = content.replace(/^---\n[\s\S]*?\n---\n/, `---\n${frontmatter}\n---\n`);
                fs.writeFileSync(mdPath, content, 'utf8');

                // Also update src/index.md for backwards compatibility
                const srcPath = path.join(__dirname, 'src', 'index.md');
                fs.writeFileSync(srcPath, content, 'utf8');
            }
        }

        res.json({ success: true, message: 'Presentation updated', presentation: metadata });
    } catch (error) {
        console.error('Error updating presentation:', error);
        res.status(500).json({ error: 'Failed to update presentation' });
    }
});

// API endpoint to duplicate presentation
app.post('/api/presentations/:id/duplicate', requireAuth, (req, res) => {
    try {
        const { id } = req.params;
        const { newId, newTitle } = req.body;

        if (!newId || !/^[a-z0-9-]+$/.test(newId)) {
            return res.status(400).json({ error: 'Invalid new presentation ID' });
        }

        const sourceMdPath = path.join(__dirname, 'presentations', `${id}.md`);
        const sourceJsonPath = path.join(__dirname, 'presentations', `${id}.json`);
        const targetMdPath = path.join(__dirname, 'presentations', `${newId}.md`);
        const targetJsonPath = path.join(__dirname, 'presentations', `${newId}.json`);

        if (!fs.existsSync(sourceMdPath)) {
            return res.status(404).json({ error: 'Source presentation not found' });
        }

        if (fs.existsSync(targetMdPath)) {
            return res.status(409).json({ error: 'Target presentation already exists' });
        }

        // Copy markdown
        const mdContent = fs.readFileSync(sourceMdPath, 'utf8');
        fs.writeFileSync(targetMdPath, mdContent, 'utf8');

        // Copy and update metadata
        const sourceMetadata = JSON.parse(fs.readFileSync(sourceJsonPath, 'utf8'));
        const newMetadata = {
            ...sourceMetadata,
            id: newId,
            title: newTitle || `${sourceMetadata.title} (Copy)`,
            created: new Date().toISOString().split('T')[0],
            modified: new Date().toISOString().split('T')[0]
        };
        fs.writeFileSync(targetJsonPath, JSON.stringify(newMetadata, null, 2), 'utf8');

        res.json({ success: true, message: 'Presentation duplicated', presentation: newMetadata });
    } catch (error) {
        console.error('Error duplicating presentation:', error);
        res.status(500).json({ error: 'Failed to duplicate presentation' });
    }
});

// API endpoint to save markdown content
app.post('/api/slides/content', requireAuth, (req, res) => {
    try {
        const { content, id } = req.body;
        if (typeof content !== 'string') {
            return res.status(400).json({ error: 'Invalid content' });
        }

        const presentationId = id || 'default';
        const mdPath = path.join(__dirname, 'presentations', `${presentationId}.md`);
        const jsonPath = path.join(__dirname, 'presentations', `${presentationId}.json`);

        // Read existing file to preserve frontmatter
        let frontmatter = '---\nlayout: presentation.njk\ntitle: My Presentation\neleventyExcludeFromCollections: true\n---\n';
        if (fs.existsSync(mdPath)) {
            const existingContent = fs.readFileSync(mdPath, 'utf8');
            const frontmatterMatch = existingContent.match(/^---[\s\S]*?---\n/);
            if (frontmatterMatch) {
                frontmatter = frontmatterMatch[0];
            }
        }

        // Write the markdown file with frontmatter
        const fullContent = frontmatter + content;
        fs.writeFileSync(mdPath, fullContent, 'utf8');

        // Update metadata modified date
        if (fs.existsSync(jsonPath)) {
            const metadata = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            metadata.modified = new Date().toISOString().split('T')[0];
            fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2), 'utf8');
        }

        // Also update src/index.md for backwards compatibility
        const srcPath = path.join(__dirname, 'src', 'index.md');
        fs.writeFileSync(srcPath, fullContent, 'utf8');

        res.json({ success: true, message: 'Content saved successfully' });
    } catch (error) {
        console.error('Error saving markdown file:', error);
        res.status(500).json({ error: 'Failed to save markdown file' });
    }
});

// API endpoint to get slides data
app.get('/slides-data.json', (req, res) => {
    try {
        const indexPath = path.join(__dirname, '_site', 'index.html');
        if (fs.existsSync(indexPath)) {
            const html = fs.readFileSync(indexPath, 'utf8');
            const slides = extractSlidesFromHTML(html);
            res.json({ slides });
        } else {
            res.json({ slides: [] });
        }
    } catch (error) {
        console.error('Error reading slides data:', error);
        res.json({ slides: [] });
    }
});

// Helper function to extract slides from HTML
function extractSlidesFromHTML(html) {
    const slides = [];
    const slideRegex = /<section class="slide"[^>]*>([\s\S]*?)<\/section>/g;
    let match;
    let index = 0;

    while ((match = slideRegex.exec(html)) !== null) {
        const slideHTML = match[1];

        // Extract content
        const contentMatch = slideHTML.match(/<div class="slide-content">([\s\S]*?)<\/div>/);
        const content = contentMatch ? contentMatch[1].trim() : '';

        // Extract notes
        const notesMatch = slideHTML.match(/<div class="presenter-notes"[^>]*>([\s\S]*?)<\/div>/);
        const notes = notesMatch ? notesMatch[1].trim() : '';

        slides.push({ index, content, notes });
        index++;
    }

    return slides;
}

// Health check for CapRover
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Presentation: http://localhost:${PORT}`);
    console.log(`Presenter view: http://localhost:${PORT}/presenter`);
    console.log(`Default presenter password: ${PRESENTER_PASSWORD}`);
});
