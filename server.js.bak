require('dotenv').config();
const express = require('express');
const cors = require('cors');
const SpotifyWebApi = require('spotify-web-api-node');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: 'http://localhost:3000/callback'
});

spotifyApi.setRefreshToken(process.env.SPOTIFY_REFRESH_TOKEN);

let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const data = await spotifyApi.refreshAccessToken();
    accessToken = data.body['access_token'];
    tokenExpiry = Date.now() + (data.body['expires_in'] * 1000) - 60000;
    spotifyApi.setAccessToken(accessToken);
    return accessToken;
  } catch (err) {
    console.error('Error refreshing access token:', err.message);
    throw err;
  }
}

app.get('/api/now-playing', async (req, res) => {
  try {
    await getAccessToken();
    
    const data = await spotifyApi.getMyCurrentPlaybackState();
    
    if (!data.body || !data.body.item) {
      return res.json({
        isPlaying: false,
        track: null
      });
    }

    const item = data.body.item;
    const isPlaying = data.body.is_playing;
    
    const track = {
      id: item.id,
      name: item.name,
      artist: item.artists.map(a => a.name).join(', '),
      album: item.album.name,
      albumArt: item.album.images[0]?.url || '',
      spotifyUrl: item.external_urls?.spotify || '',
      isPlaying: isPlaying,
      progressMs: data.body.progress_ms || 0,
      durationMs: item.duration_ms || 0,
      context: data.body.context?.external_urls?.spotify || null
    };

    res.json({
      isPlaying: isPlaying,
      track: track,
      timestamp: Date.now()
    });

  } catch (err) {
    console.error('Error fetching now playing:', err.message);
    res.status(500).json({ 
      error: 'Failed to fetch now playing',
      message: err.message 
    });
  }
});

app.get('/api/token', async (req, res) => {
  try {
    const data = await spotifyApi.refreshAccessToken();
    res.json({
      accessToken: data.body['access_token'],
      expiresIn: data.body['expires_in']
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Now playing endpoint: http://localhost:${PORT}/api/now-playing`);
});