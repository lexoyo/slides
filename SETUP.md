# Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Site

```bash
npm run build
```

This generates static files in `_site/` directory.

### 3. Start the Server

```bash
npm start
```

Or for development with hot reload:

```bash
npm run dev
```

### 4. Access the Application

- **Presentation View**: http://localhost:3000
- **Presenter View**: http://localhost:3000/presenter (password: presenter123)

## Usage

### Keyboard Controls

Both presentation and presenter views support:
- **Arrow keys** (←/→/↑/↓): Navigate slides
- **Space**: Next slide
- **Page Up/Down**: Navigate slides
- **Home**: Go to first slide
- **End**: Go to last slide

### Presenter View Features

1. **Login**: Access via `/presenter` with password (default: presenter123)
2. **Current Slide Preview**: See what's currently displayed
3. **Next Slide Preview**: Know what's coming next
4. **Presenter Notes**: Private notes only visible to you
5. **Remote Control**: Navigate slides from your phone
6. **Connection Status**: See WebSocket connection state

### Creating Slides

Edit `src/index.md` or create new `.md` files in `src/`:

```markdown
# Slide Title

Content here

<!-- notes
Your presenter notes
Only visible in presenter view
-->

---

# Next Slide

More content
```

## Deployment to CapRover

### Prerequisites

- CapRover instance running
- CapRover CLI: `npm install -g caprover`

### Steps

1. **Login to CapRover**:
   ```bash
   caprover login
   ```

2. **Deploy**:
   ```bash
   caprover deploy
   ```

3. **Set Environment Variables** in CapRover dashboard:
   - `SESSION_SECRET`: Random secure string
   - `PRESENTER_PASSWORD`: Your secure password
   - `NODE_ENV`: production

4. **Access**: Your app will be available at your CapRover domain

## Environment Variables

Create `.env` file (see `.env.example`):

```env
PORT=3000
NODE_ENV=production
SESSION_SECRET=your-secure-secret-here
PRESENTER_PASSWORD=your-secure-password
```

## Troubleshooting

### WebSocket Connection Issues

- Ensure your server supports WebSocket connections
- Check firewall settings
- For HTTPS, WebSocket uses WSS automatically

### Presenter View Not Loading

- Make sure you've run `npm run build` first
- Check that the server is running
- Verify the password is correct

### Slides Not Syncing

- Check WebSocket connection status in presenter view
- Look at browser console for errors
- Ensure multiple windows are connected to same server

## Customization

### Theme

Edit `src/css/theme.css` to change:
- Colors and gradients
- Typography
- Slide animations
- Layout

### Layouts

Create custom layouts in `src/_layouts/` using Nunjucks templates.

## Security Notes

1. **Change the default password** in production
2. **Use a strong SESSION_SECRET**
3. **Use HTTPS** in production
4. Consider adding rate limiting for the login endpoint

## Support

For issues or questions, refer to the README.md file.
