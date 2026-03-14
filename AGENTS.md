# AGENTS.md - Development Guide

This file provides guidelines for agents working in this repository.

## Project Overview

- **Project**: Portfolio Spotify Now Playing
- **Type**: Next.js API endpoint for fetching current Spotify playback
- **Framework**: Next.js 14 with API Routes
- **Runtime**: Node.js (Vercel serverless)

## Build Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Deploy to Vercel (if CLI installed)
vercel
```

## Project Structure

```
.
├── pages/
│   ├── index.js          # Homepage
│   └── api/
│       └── now-playing.js # Spotify API endpoint
├── .env                  # Environment variables (local)
├── credentials.env       # Spotify credentials backup
├── package.json
├── README.md
└── PRD.md               # Product requirements
```

## Code Style Guidelines

### General

- Use 2 spaces for indentation
- No trailing whitespace
- Use single quotes for strings
- Use semicolons at end of statements

### Imports

- Use CommonJS `require()` for dependencies in API routes
- Use ES modules `import/export` for React components
- Group imports: external libs → internal modules → utilities

```javascript
// API routes (CommonJS)
const SpotifyWebApi = require('spotify-web-api-node');
const otherLib = require('other-lib');

// React components (ESM)
import { useState } from 'react';
import SomeComponent from './SomeComponent';
```

### Naming Conventions

- **Files**: kebab-case (e.g., `now-playing.js`)
- **Functions**: camelCase (e.g., `getAccessToken`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `TOKEN_EXPIRY_BUFFER`)
- **React Components**: PascalCase (e.g., `NowPlayingWidget`)

### Environment Variables

- All secrets must come from `process.env`
- Never hardcode credentials
- Use `.env` file for local development (gitignored)
- Required env vars:
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`
  - `SPOTIFY_REFRESH_TOKEN`

### Error Handling

- Use try/catch for async operations
- Return appropriate HTTP status codes:
  - `200` - Success
  - `400` - Bad request
  - `401` - Unauthorized
  - `405` - Method not allowed
  - `500` - Server error
- Log errors with `console.error()` but don't expose internal details to client
- Return structured error responses:

```javascript
catch (err) {
  console.error('Error fetching now playing:', err.message);
  res.status(500).json({ 
    error: 'Failed to fetch now playing',
    message: err.message 
  });
}
```

### CORS Headers

Include CORS headers on all API responses:

```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

Handle preflight requests:

```javascript
if (req.method === 'OPTIONS') {
  return res.status(200).end();
}
```

### API Route Patterns

- Place API routes in `pages/api/` directory
- Export default async function with `req, res` parameters
- Validate request method first
- Use appropriate HTTP methods

```javascript
export default async function handler(req, res) {
  // Validate method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Process request...
}
```

### Next.js Specific

- API routes: `pages/api/*.js`
- Pages: `pages/*.js`
- Use `export default` for page/component exports
- Use `export async function getServerSideProps()` for server-side data fetching if needed

## Adding New Features

1. **API Routes**: Add to `pages/api/`
2. **Pages**: Add to `pages/`
3. **Components**: Create `components/` directory and import in pages
4. **Styles**: Use CSS modules or inline styles

## Vercel Deployment

- Framework Preset: **Next.js**
- Build Command: (empty - uses default)
- Output Directory: (empty - uses default)
- Environment variables must be added in Vercel dashboard

## Testing

This project currently has no test suite. When adding tests:

- Use Jest and React Testing Library
- Place tests in `__tests__/` or `*.test.js` alongside source files
- Run single test: `npm test -- --testPathPattern=filename`
