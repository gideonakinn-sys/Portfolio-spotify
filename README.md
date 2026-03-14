# Spotify Now Playing

Express.js server that provides a Spotify Now Playing API for Framer portfolios.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```


3. Run the server:
   ```bash
   npm start
   ```

## API Endpoints

- `GET /api/now-playing` - Returns current playback state
- `GET /api/token` - Refreshes access token
- `GET /health` - Health check

## Spotify Developer Setup

1. Create an app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Get your Client ID and Client Secret
3. Generate a refresh token with scopes: `user-read-currently-playing`, `user-read-playback-state`
