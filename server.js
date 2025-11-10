const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

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
        res.redirect('/login');
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '_site', 'index.html'));
});

app.get('/presenter', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '_site', 'presenter', 'index.html'));
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
        res.redirect('/presenter');
    } else {
        res.redirect('/login?error=1');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
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
