import { useState, useEffect } from "react"

interface Track {
  id: string
  name: string
  artist: string
  album: string
  albumArt: string
  spotifyUrl: string
  isPlaying: boolean
  progressMs: number
  durationMs: number
  context: string | null
}

interface NowPlayingResponse {
  isPlaying: boolean
  track: Track | null
  timestamp: number
}

const SpotifyIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#1DB954">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
)

export default function NowPlaying() {
  const [data, setData] = useState<NowPlayingResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNowPlaying() {
      try {
        const res = await fetch("https://portfolio-spotify-3wmg.vercel.app/api/now-playing")
        const json: NowPlayingResponse = await res.json()
        setData(json)
      } catch (err) {
        console.error("Failed to fetch now playing:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchNowPlaying()
    const interval = setInterval(fetchNowPlaying, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "12px 16px",
          background: "#FFFFFF",
          borderRadius: "12px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "8px",
            background: "#F5F5F5",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ width: 80, height: 14, background: "#F5F5F5", borderRadius: "4px" }} />
          <div style={{ width: 140, height: 20, background: "#F5F5F5", borderRadius: "4px" }} />
          <div style={{ width: 100, height: 14, background: "#F5F5F5", borderRadius: "4px" }} />
        </div>
      </div>
    )
  }

  const isPlaying = data?.isPlaying === true
  const track = data?.track

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "12px 16px",
        background: "#FFFFFF",
        borderRadius: "12px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Album Art */}
      <img
        src={track?.albumArt || "https://via.placeholder.com/80"}
        alt="Album art"
        style={{
          width: 80,
          height: 80,
          borderRadius: "8px",
          objectFit: "cover",
          background: "#F5F5F5",
        }}
      />

      {/* Track Info */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          minWidth: 0,
        }}
      >
        {/* Now Playing / Not Playing */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: isPlaying ? "#1DB954" : "#9E9E9E",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          {isPlaying && <SpotifyIcon size={14} />}
          {isPlaying ? "Now Playing" : "Not playing"}
        </div>

        {/* Song Title */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#191414",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 200,
          }}
        >
          {track?.name || "—"}
        </div>

        {/* Artist Name */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "#6A6A6A",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 200,
          }}
        >
          {track?.artist || "—"}
        </div>
      </div>
    </div>
  )
}
