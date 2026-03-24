# LookMyClass API Documentation

A complete, static API documentation website for the LookMyClass platform — built with vanilla HTML, CSS, and JavaScript. No build tools, no external dependencies.

---

## Overview

This site documents the full LookMyClass REST API, covering:

- **Auth** — Login, register, 2FA, password reset
- **Organization** — Admin and SuperAdmin org management
- **User Management** — CRUD for users and roles
- **Users** — Profile, email change, password change
- **SA Subscriptions** — SuperAdmin subscription plan management
- **User Subscriptions** — Purchase plans, verify payments, billing history
- **Academics** — Curriculums, subjects, topics
- **API Keys** — Create and manage API keys
- **Documents** — Upload and manage PDF documents (S3)
- **Test Series** — AI-powered MCQ generation and test management

---

## Screenshot

![API Docs Preview](https://via.placeholder.com/900x500/0f172a/f1f5f9?text=LookMyClass+API+Docs)

---

## Local Development

No build step required. Just serve the files from a local HTTP server.

**Option 1 — Python (built-in)**

```bash
cd /path/to/lookmyclass.github.io
python3 -m http.server 8080
# Open http://localhost:8080
```

**Option 2 — Node.js `serve`**

```bash
npx serve .
# Open the URL shown in the terminal
```

**Option 3 — VS Code Live Server**

Install the "Live Server" extension, right-click `index.html`, and select "Open with Live Server".

> Note: You must use a local server (not `file://`) because `fetch('data/api.json')` requires HTTP.

---

## GitHub Pages Deployment

This site is designed to be deployed directly from the `main` branch root.

1. Push all files to the `main` branch of your `<username>.github.io` repository.
2. Go to **Settings > Pages** in your GitHub repository.
3. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **Save**.
5. Your docs will be live at `https://<username>.github.io` within a few minutes.

---

## File Structure

```
lookmyclass.github.io/
├── index.html          # Main HTML shell
├── styles.css          # All CSS (variables, layout, components)
├── script.js           # All JavaScript (data loading, rendering, search)
├── data/
│   └── api.json        # API endpoint definitions (single source of truth)
└── README.md           # This file
```

---

## Customization Guide

### Adding a new endpoint

Edit `data/api.json`. Add an entry to the relevant group's `endpoints` array:

```json
{
  "id": "my-endpoint",
  "name": "My Endpoint",
  "method": "POST",
  "path": "/my-resource",
  "subgroup": null,
  "auth": true,
  "description": "Does something useful.",
  "requestBody": {
    "type": "json",
    "example": { "field": "value" }
  },
  "responses": [
    {
      "status": 201,
      "description": "Created",
      "example": { "success": true, "data": {} }
    }
  ]
}
```

### Adding a new group

Add a new object to the `groups` array in `data/api.json`:

```json
{
  "id": "my-group",
  "name": "My Group",
  "color": "#06b6d4",
  "endpoints": []
}
```

### Changing the base URL

Update `info.baseUrl` in `data/api.json`:

```json
{
  "info": {
    "baseUrl": "https://api.yourdomain.com"
  }
}
```

### Styling

All design tokens (colors, spacing, fonts) are defined as CSS custom properties at the top of `styles.css` under the `:root` selector. Change them to match your brand.

### Method badge colors

Defined in `styles.css` as CSS variables:

```css
--color-get:    #10b981;
--color-post:   #3b82f6;
--color-patch:  #f59e0b;
--color-delete: #ef4444;
--color-put:    #8b5cf6;
```

---

## Features

- Instant client-side search across all endpoints
- Collapsible sidebar groups and endpoint cards
- Auto-generated cURL and JavaScript `fetch` code examples
- Syntax-highlighted request/response JSON
- One-click copy for code blocks and the base URL
- URL hash routing (`#endpoint-id`) for shareable links
- Keyboard shortcut `Ctrl+K` / `Cmd+K` to focus search
- Fully responsive — mobile-friendly with slide-in sidebar
- No build tools, no external CDNs, no runtime dependencies

---

## License

MIT
