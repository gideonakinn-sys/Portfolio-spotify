const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

let accessToken = null;
let tokenExpiry = 0;
let lastTrack = null;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
    if (!refreshToken) {
      throw new Error('SPOTIFY_REFRESH_TOKEN not configured');
    }
    
    spotifyApi.setRefreshToken(refreshToken);
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await getAccessToken();
    
    const data = await spotifyApi.getMyCurrentPlaybackState();
    
    if (!data.body || !data.body.item) {
      return res.json({
        isPlaying: false,
        track: lastTrack ? { ...lastTrack, isPlaying: false } : null,
        timestamp: Date.now()
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

    lastTrack = track;

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
}
