# Now Playing Widget - Product Architecture

## 1. System Overview

The Now Playing widget is a client-side React component integrated into a Framer portfolio site. It authenticates with Spotify's OAuth 2.0 (PKCE) flow, polls the Spotify Web API for real-time playback data, and renders an interactive widget displaying current track information.

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRAMER PORTFOLIO                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    NOW PLAYING WIDGET                    │   │
│  │  ┌──────────┐  ┌────────────────────────────────────┐  │   │
│  │  │ Album    │  │ Track Title                        │  │   │
│  │  │ Art      │  │ Artist Name                        │  │   │
│  │  │ 80x80    │  │ ● Now Playing                      │  │   │
│  │  └──────────┘  └────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────┐    │
│  │   Auth      │    │  Data Service   │    │   UI         │    │
│  │   Manager   │    │  (API + Cache)  │    │   Render     │    │
│  └─────────────┘    └─────────────────┘    └──────────────┘    │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   SPOTIFY API        │
                    │  - Auth Endpoint     │
                    │  - Player API         │
                    └─────────────────────┘
```

---

## 2. System Boundaries & Scope

### 2.1 In Scope
- Spotify OAuth 2.0 authentication (PKCE flow)
- Real-time playback data fetching
- Widget UI rendering and interactions
- Token management and refresh
- Local caching for offline/error states
- Mobile responsive design

### 2.2 Out of Scope
- Server-side components (all client-side)
- User session management beyond Spotify
- Playlist/saved tracks functionality
- Playback control (play/pause/skip)
- Analytics and tracking
- Multiple music service support (Spotify only)

---

## 3. Core Systems

### 3.1 Authentication System

**Purpose:** Handle Spotify OAuth 2.0 PKCE flow to obtain and maintain access tokens.

**Components:**
| Component | Responsibility |
|-----------|----------------|
| `AuthProvider` | Context provider for auth state |
| `PkceChallenge` | Generate code verifier + challenge |
| `TokenManager` | Store, retrieve, refresh tokens |
| `AuthRedirect` | Handle OAuth callback |

**State Machine:**
```
DISCONNECTED ──► AUTHENTICATING ──► AUTHENTICATED ──► EXPIRED
     │                │                   │
     │                │                   ▼
     │                │           REFRESHING ──► AUTHENTICATED
     │                │                   │
     ▼                ▼                   ▼
ERROR ◄──────────► TOKEN_ERROR ◄───────► DISCONNECTED
```

**Public API:**
```typescript
interface AuthSystem {
  // Initialize auth flow
  initiateAuth(): Promise<void>;
  
  // Handle callback with auth code
  handleCallback(code: string, state: string): Promise<void>;
  
  // Get valid access token
  getAccessToken(): Promise<string | null>;
  
  // Check if authenticated
  isAuthenticated(): boolean;
  
  // Clear auth state (logout)
  logout(): void;
}
```

### 3.2 Data Service System

**Purpose:** Fetch, transform, cache, and manage playback data from Spotify API.

**Components:**
| Component | Responsibility |
|-----------|----------------|
| `SpotifyClient` | HTTP client for Spotify API |
| `DataTransformer` | Map API response to internal schema |
| `CacheManager` | LocalStorage cache for offline support |
| `PollingService` | Interval-based API polling |
| `ErrorHandler` | Retry logic, fallback data |

**Data Flow:**
```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Spotify    │────►│   Spotify    │────►│    Transformer │
│  API        │     │   Client     │     │    (Type Map)  │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                  │
                    ┌──────────────┐              ▼
                    │  Cache Store │◄────┌─────────────────┐
                    │  (localStorage)    │  NowPlaying     │
                    └──────────────┘     │  State          │
                                          └─────────────────┘
```

**Polling Strategy:**
```typescript
interface PollingConfig {
  interval: 30000;           // 30 seconds
  enabledWhenVisible: true; // Pause when tab hidden
  retryOnError: {
    maxAttempts: 3;
    backoffMultiplier: 2;
    initialDelay: 1000;
  };
  onStateChange: (isPlaying: boolean) => void;
}
```

**Public API:**
```typescript
interface DataService {
  // Fetch current playback
  getCurrentlyPlaying(): Promise<NowPlayingData | null>;
  
  // Refresh playback data
  refresh(): Promise<void>;
  
  // Get cached data
  getCached(): NowPlayingData | null;
  
  // Subscribe to updates
  subscribe(callback: (data: NowPlayingData) => void): () => void;
}
```

### 3.3 UI Render System

**Purpose:** Render the Now Playing widget with animations and interactions.

**Components:**
| Component | Responsibility |
|-----------|----------------|
| `NowPlayingWidget` | Main container component |
| `AlbumArt` | Image display with loading/pulse states |
| `TrackInfo` | Title, artist, status text |
| `PlayButton` | Clickable overlay for deep link |
| `SkeletonLoader` | Loading placeholder |
| `ErrorDisplay` | Error state with retry button |

**Render States:**
```
┌─────────────────────────────────────────────┐
│                 RENDER TREE                  │
│  ┌─────────────────────────────────────┐    │
│  │           WidgetContainer           │    │
│  │  ┌───────────┐  ┌───────────────┐  │    │
│  │  │ AlbumArt  │  │   TrackInfo   │  │    │
│  │  │ - Image   │  │ - Title       │  │    │
│  │  │ - Loading │  │ - Artist      │  │    │
│  │  │ - Pulse   │  │ - Status      │  │    │
│  │  └───────────┘  └───────────────┘  │    │
│  └─────────────────────────────────────┘    │
│              │           │                   │
│              ▼           ▼                   │
│        ┌─────────────────────────┐          │
│        │      Overlay (Link)     │          │
│        │   (invisible clickable) │          │
│        └─────────────────────────┘          │
└─────────────────────────────────────────────┘
```

**Interaction Handlers:**
```typescript
interface WidgetInteractions {
  onWidgetClick: () => void;       // Open Spotify URL
  onRetryClick: () => void;       // Retry failed request
  onRefreshClick: () => void;     // Manual refresh
  onHover: () => void;            // Trigger hover state
  onLeave: () => void;            // Remove hover state
}
```

---

## 4. Data Flow Architecture

### 4.1 Authentication Flow (PKCE)

```
┌──────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                           │
└──────────────────────────────────────────────────────────────────┘

1. User visits site
        │
        ▼
2. Check for valid token in storage
        │
        ▼
3. [NO TOKEN] ──► Generate code_verifier + code_challenge
        │                │
        │                ▼
        │         Store verifier in storage
        │                │
        │                ▼
        │         Redirect to Spotify Auth URL
        │                │
        │                ▼
        │    ┌─────────────────────────────────┐
        │    │  https://accounts.spotify.com  │
        │    │  /authorize?                    │
        │    │    client_id=XXX&              │
        │    │    response_type=code&         │
        │    │    redirect_uri=XXX&           │
        │    │    scope=...&                  │
        │    │    code_challenge=XXX&         │
        │    │    code_challenge_method=S256  │
        │    └─────────────────────────────────┘
        │
        ▼
4. User logs in / authorizes
        │
        ▼
5. Spotify redirects to /callback?code=XXX&state=YYY
        │
        ▼
6. Exchange code for tokens
        │
        ▼
7. Store tokens in sessionStorage
        │
        ▼
8. [HAS TOKEN] ──► Proceed to fetch data
```

### 4.2 Data Fetching Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      DATA FETCHING FLOW                          │
└──────────────────────────────────────────────────────────────────┘

                        ┌─────────────────────┐
                        │  Component Mounts  │
                        └──────────┬──────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │  Check token validity   │
                    │  (expires_at < now?)    │
                    └───────────┬──────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
        [EXPIRED]                           [VALID]
              │                                   │
              ▼                                   ▼
    ┌─────────────────┐              ┌─────────────────────┐
    │ Refresh token   │              │ Fetch currently    │
    │ via /api/token  │              │ playing endpoint    │
    └────────┬────────┘              └──────────┬──────────┘
              │                                   │
              ▼                                   ▼
    ┌─────────────────┐              ┌─────────────────────┐
    │ Store new token│              │ Parse response      │
    │ and retry      │              │ (200 or 204)        │
    └────────┬────────┘              └──────────┬──────────┘
              │                                   │
              └─────────────────┬─────────────────┘
                                ▼
                    ┌─────────────────────────────┐
                    │     Map to Internal Type    │
                    │     (DataTransformer)       │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │     Update State            │
                    │     + Cache to Storage      │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │     Render UI               │
                    └─────────────────────────────┘
```

---

## 5. API Design

### 5.1 Internal API (Custom Hooks)

```typescript
// Main hook for component consumption
export function useNowPlaying(): {
  data: NowPlayingState;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

// Auth hook
export function useSpotifyAuth(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  error: Error | null;
};
```

### 5.2 External API (Spotify)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/authorize` | GET | Initial OAuth redirect |
| `/api/token` | POST | Exchange code for tokens / refresh |
| `/v1/me/player/currently-playing` | GET | Fetch current track |

### 5.3 Error Response Schemas

```typescript
// API Error
interface ApiError {
  error: {
    status: number;
    message: string;
  };
}

// Auth Error
interface AuthError {
  error: string;
  error_description: string;
}

// Component Error State
interface WidgetError {
  type: 'AUTH' | 'API' | 'NETWORK' | 'UNKNOWN';
  message: string;
  retryable: boolean;
  timestamp: number;
}
```

---

## 6. Security Architecture

### 6.1 Token Security

```
┌─────────────────────────────────────────────────────────────────┐
│                     TOKEN SECURITY LAYERS                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│         sessionStorage              │
│  Key: spotify_tokens                │
│  ┌───────────────────────────────┐  │
│  │ {                            │  │
│  │   access_token: "NgA...",    │  │
│  │   refresh_token: "Qt...",    │  │
│  │   expires_at: 1699999999,    │  │
│  │   scope: "user-read-..."     │  │
│  │ }                            │  │
│  └───────────────────────────────┘  │
│                                     │
│  ✓ Cleared on tab close            │
│  ✓ Not accessible via JS from      │
│    other domains (same-origin)     │
│  ✗ Vulnerable to XSS               │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│        XSS Protection               │
│  - Sanitize all user inputs        │
│  - Use Content Security Policy     │
│  - HttpOnly cookies (if server)    │
│  - Implement token rotation        │
└─────────────────────────────────────┘
```

### 6.2 PKCE Security Details

```
┌─────────────────────────────────────────────────────────────────┐
│                        PKCE WORKFLOW                            │
└─────────────────────────────────────────────────────────────────┘

┌───────────────┐                    ┌───────────────────────────┐
│   CLIENT      │                    │       SPOTIFY             │
│               │                    │                           │
│  1. Generate  │                    │                           │
│     random    │                    │                           │
│     string    │                    │                           │
│     (verifier)│                    │                           │
│               │                    │                           │
│  2. SHA-256   │                    │                           │
│     hash it   │                    │                           │
│               │                    │                           │
│  3. Base64URL │                    │                           │
│     encode    │                    │                           │
│     (challenge)                   │                           │
│               │                    │                           │
└───────┬───────┘                    └────────────┬──────────────┘
        │                                        │
        │  GET /authorize?                       │
        │    code_challenge=XXX                 │
        │    code_challenge_method=S256         │
        │                                        │
        ├──────────────────────────────────────►│
        │                                        │
        │  POST /api/token                      │
        │    grant_type=authorization_code      │
        │    code=XXX                           │
        │    code_verifier=YYY                 │
        │                                        │
        ├──────────────────────────────────────►│
        │                                        │
        │  { access_token, refresh_token }      │
        │                                        │
        ◄───────────────────────────────────────┤
        │                                        │
        │                                        │
        │  Spotify verifies challenge           │
        │  matches original challenge           │
        │  (proves same client initiated)       │
        │                                        │
        ▼                                        ▼
```

### 6.3 Security Checklist

| Item | Implementation | Priority |
|------|----------------|----------|
| HTTPS only | Enforce in Framer deploy settings | Required |
| Redirect URI validation | Exact match in Spotify Dashboard | Required |
| State parameter | Generate random 32-byte string, validate on callback | Required |
| Token storage | sessionStorage (not localStorage) | Required |
| No token logging | Remove all console.log of tokens | Required |
| CSP headers | Add frame-ancestors for Spotify CDN | Recommended |
| Error messages | Don't expose token/ID in error display | Required |

---

## 7. Component Architecture

### 7.1 Directory Structure

```
src/
├── components/
│   └── NowPlaying/
│       ├── NowPlayingWidget.tsx    # Main container
│       ├── NowPlayingWidget.styles.ts  # CSS-in-JS styles
│       ├── AlbumArt.tsx            # Album artwork component
│       ├── TrackInfo.tsx          # Track text components
│       ├── StatusIndicator.tsx    # Playing/paused dot
│       ├── Skeleton.tsx           # Loading placeholder
│       ├── ErrorState.tsx         # Error display
│       └── IdleState.tsx          # Not listening state
├── hooks/
│   ├── useSpotifyAuth.ts           # Authentication logic
│   ├── useNowPlaying.ts           # Data fetching + polling
│   ├── useVisibilityChange.ts     # Tab visibility detection
│   └── useTokenRefresh.ts         # Token refresh logic
├── services/
│   ├── spotifyClient.ts           # HTTP client wrapper
│   ├── tokenManager.ts            # Token storage/retrieval
│   ├── cacheManager.ts            # LocalStorage cache
│   └── pollingService.ts          # Polling logic
├── utils/
│   ├── pkce.ts                    # PKCE code generation
│   ├── transform.ts               # API response mapping
│   ├── constants.ts               # Config constants
│   └── validation.ts              # Input validation
├── types/
│   ├── spotify.ts                 # Spotify API types
│   ├── auth.ts                    # Auth types
│   └── widget.ts                  # Component types
├── context/
│   └── SpotifyContext.tsx         # React context provider
└── index.ts                       # Public exports
```

### 7.2 Component Hierarchy

```
<SpotifyProvider>
  <AuthHandler>
    <NowPlayingWidget>
      <WidgetContainer>
        <ClickableOverlay>        ──► Opens Spotify URL
        <AlbumArt>                ──► Image + pulse animation
          <ImageLoader>           ──► Lazy loading
          <PulseIndicator>        ──► Animated ring when playing
        <TrackInfo>
          <TrackTitle>            ──► Truncated at 2 lines
          <ArtistName>
          <StatusIndicator>       ──► Green/gray dot
        <ErrorState>              ──► Overlay on error
        <IdleState>               ──► When not listening
        <Skeleton>                ──► Loading state
      </WidgetContainer>
    </NowPlayingWidget>
  </AuthHandler>
</SpotifyProvider>
```

### 7.3 Component Interfaces

```typescript
// NowPlayingWidget Props
interface NowPlayingWidgetProps {
  size?: 'small' | 'medium' | 'large';
  showStatus?: boolean;
  enableDeepLink?: boolean;
  refreshInterval?: number;
  className?: string;
  onError?: (error: WidgetError) => void;
  onTrackChange?: (track: SpotifyTrack) => void;
}

// AlbumArt Props
interface AlbumArtProps {
  url: string;
  alt: string;
  isPlaying: boolean;
  size: number;
  onLoad?: () => void;
  onError?: () => void;
}

// TrackInfo Props
interface TrackInfoProps {
  title: string;
  artist: string;
  isPlaying: boolean;
  showExplicit?: boolean;
}
```

---

## 8. State Management

### 8.1 State Shape

```typescript
interface AppState {
  auth: {
    status: 'idle' | 'loading' | 'authenticated' | 'error';
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
    error: AuthError | null;
  };
  
  nowPlaying: {
    status: 'idle' | 'loading' | 'success' | 'error';
    data: NowPlayingData | null;
    lastUpdated: number | null;
    error: ApiError | null;
    isPlaying: boolean;
  };
  
  ui: {
    isHovered: boolean;
    isClicked: boolean;
    showError: boolean;
  };
}
```

### 8.2 State Transitions

```
┌──────────────────────────────────────────────────────────────────┐
│                     STATE TRANSITION DIAGRAM                     │
└──────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   INITIAL    │
                    └──────┬───────┘
                           │ component mount
                           ▼
                    ┌──────────────┐
              ┌────►│   LOADING    │◄────────┐
              │     └──────┬───────┘         │
              │            │                   │
      no auth │            │ auth valid        │ auth error
              │            ▼                   ▼
              │     ┌──────────────┐    ┌──────────────┐
              │     │    SUCCESS  │    │    ERROR     │
              │     │  (show data) │    │ (show error) │
              │     └──────┬───────┘    └──────┬───────┘
              │            │                   │
              │            │ retry             │ fix auth
              │            │                   │
              └────────────┴───────────────────┘
```

---

## 9. Error Handling Strategy

### 9.1 Error Classification

| Error Type | Code | Retry | User Message |
|------------|------|-------|--------------|
| Network Error | - | Yes (3x) | "Unable to connect. Check your internet." |
| Rate Limited | 429 | Yes (exponential) | "Too many requests. Retrying..." |
| Token Expired | 401 | Yes (refresh) | (Auto-refresh, no message) |
| Token Invalid | 401 | No | "Please reconnect your Spotify account." |
| Auth Declined | 403 | No | "Authorization required." |
| Not Found | 404 | No | (Shouldn't happen for this endpoint) |
| Server Error | 500+ | Yes (3x) | "Spotify service unavailable." |
| Unknown | - | No | "Something went wrong." |

### 9.2 Error Recovery Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     ERROR RECOVERY FLOW                         │
└─────────────────────────────────────────────────────────────────┘

API Request
    │
    ▼
┌───────────┐
│ Response  │
└─────┬─────┘
      │
 ┌────┴────┐
 ▼         ▼
200       Error
  │         │
  │         ▼
  │    ┌─────────┐
  │    │ Classify│
  │    │ Error   │
  │    └────┬────┘
  │         │
  ▼         ▼
Update     ┌──────────────┐
State      │ 401 (Token)  │
           └──────┬───────┘
                  │
                  ▼
           ┌─────────────┐
           │ Refresh Token│
           └──────┬──────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
    Success            Failed
         │                 │
         ▼                 ▼
    Retry API       Show Error
         │                 │
         ▼                 ▼
    Update          Prompt Re-
    State           Auth
```

---

## 10. Infrastructure & Deployment

### 10.1 Environment Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENVIRONMENT VARIABLES                        │
└─────────────────────────────────────────────────────────────────┘

# Required (set in Framer settings)
VITE_SPOTIFY_CLIENT_ID=abc123def456ghij789...
VITE_SPOTIFY_REDIRECT_URI=https://your-site.framer.app/callback

# Optional (with defaults)
VITE_POLLING_INTERVAL=30000
VITE_CACHE_DURATION=3600000
VITE_TOKEN_REFRESH_BUFFER=300000
```

### 10.2 Spotify App Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│               SPOTIFY DASHBOARD SETTINGS                        │
└─────────────────────────────────────────────────────────────────┘

App Settings:
├── App Name: [Your Name] Portfolio
├── App Website: https://your-site.framer.app
├── Redirect URIs:
│   └── https://your-site.framer.app/callback
├── Scopes:
│   ├── user-read-currently-playing
│   └── user-read-playback-state
└── Bundle ID: (not needed for web)

```

### 10.3 Deployment Checklist

| Task | Platform | Notes |
|------|----------|-------|
| Set environment variables | Framer | In project settings |
| Configure redirect URI | Spotify Dashboard | Must match exactly |
| Enable HTTPS | Framer | Automatic |
| Add to page | Framer Editor | Drag component |
| Test OAuth flow | Browser | Full user journey |
| Test polling | Browser | Wait 30s for update |
| Test error states | Browser | Disconnect network |

---

## 11. Integration Points

### 11.1 External Systems

| System | Integration Type | Protocol | Data Exchanged |
|--------|------------------|----------|----------------|
| Spotify API | REST API | HTTPS | Track data, tokens |
| Spotify CDN | Image CDN | HTTPS | Album artwork |
| Framer | Component | React props | None (output only) |
| Browser | Platform API | JavaScript | Visibility, storage |

### 11.2 Browser APIs Used

| API | Purpose |
|-----|---------|
| `fetch` | HTTP requests to Spotify |
| `sessionStorage` | Token storage |
| `localStorage` | Cache storage |
| `visibilitychange` | Pause/resume polling |
| `crypto.getRandomValues` | PKCE code generation |
| `performance.now()` | Timing measurements |

---

## 12. Performance Considerations

### 12.1 Loading Performance

| Metric | Target | Implementation |
|--------|--------|----------------|
| Initial load | < 500ms | Lazy load component |
| Image load | < 2s | Use small image variant (64px) |
| Token check | < 50ms | Synchronous storage read |
| First render | < 100ms | Use cached data if available |

### 12.2 Runtime Performance

| Metric | Target | Implementation |
|--------|--------|----------------|
| Polling overhead | < 1% CPU | 30s interval, pause when hidden |
| Memory usage | < 50MB | No large data stores |
| Re-renders | Minimal | React.memo on heavy components |
| Image caching | Browser default | Let browser handle |

### 12.3 Network Optimization

- Use smallest album art (64x64) to reduce bandwidth
- Cache artwork URLs (same track = same URL)
- Batch token refresh (before expiration, not on demand)
- Debounce rapid interactions

---

## 13. Testing Strategy

### 13.1 Test Types

| Type | Coverage | Tools |
|------|----------|-------|
| Unit | Hooks, utils, transforms | Jest + React Testing Library |
| Integration | Auth flow, API client | Mock service worker |
| E2E | Full user journey | Playwright |
| Manual | Edge cases, visual | Browser |

### 13.2 Test Scenarios

```typescript
// Mock data for testing
const mockPlayingTrack = {
  item: {
    id: 'track123',
    name: 'Test Track',
    artists: [{ name: 'Test Artist' }],
    album: {
      name: 'Test Album',
      images: [{ url: 'https://example.com/art.jpg' }]
    },
    external_urls: { spotify: 'https://open.spotify.com/track/track123' }
  },
  is_playing: true
};

const mockPausedTrack = {
  ...mockPlayingTrack,
  is_playing: false
};

const mockNoContent = null; // 204 response

// Test cases
describe('useNowPlaying', () => {
  it('shows loading state initially', () => {});
  it('displays track when playing', () => {});
  it('shows paused indicator when paused', () => {});
  it('shows idle when no content', () => {});
  it('retries on network error', () => {});
  it('refreshes token on 401', () => {});
  it('pauses polling when tab hidden', () => {});
});
```

---

## 14. Monitoring & Analytics (Future)

| Metric | Collection | Purpose |
|--------|------------|---------|
| Widget views | Framer analytics | Usage tracking |
| Auth success rate | Custom event | Auth flow health |
| API error rate | Custom event | Reliability |
| Poll frequency | Performance API | Optimize timing |

---

## 15. Architecture Summary Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARCHITECTURE SUMMARY                              │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │    FRAMER    │
                              │   PORTFOLIO  │
                              └──────┬───────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
           ┌────────┴────┐   ┌──────┴──────┐  ┌─────┴─────┐
           │   BROWSER   │   │   REACT      │  │   UI      │
           │   APIs      │   │   CONTEXT    │  │   LAYER   │
           │             │   │              │  │           │
           │ - Storage   │   │ - AuthState  │  │ - Widget  │
           │ - Crypto    │   │ - DataState  │  │ - Art     │
           │ - Network   │   │ - UI State   │  │ - Info    │
           └──────┬───────┘   └──────┬───────┘  └─────┬─────┘
                  │                  │                │
                  └──────────────────┼────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
           ┌────────┴────┐   ┌──────┴──────┐  ┌─────┴─────┐
           │  SERVICES   │   │   HOOKS     │  │  TYPES    │
           │             │   │              │  │           │
           │ - Spotify   │   │ - useAuth    │  │ - Track   │
           │   Client   │   │ - usePlaying │  │ - Auth    │
           │ - Token    │   │ - useRefresh │  │ - Widget  │
           │   Manager  │   │ - useVisible │  │           │
           │ - Cache    │   │              │  │           │
           │ - PKCE     │   │              │  │           │
           └──────┬───────┘   └──────┬──────┘  └───────────┘
                  │                  │
                  └──────────────────┼────────────────┐
                                     │                │
                          ┌──────────┴──────────┐  ┌────┴─────────┐
                          │    SPOTIFY API      │  │  SPOTIFY     │
                          │                     │  │  AUTH        │
                          │ - Player Endpoints  │  │  ENDPOINTS   │
                          │ - Token Endpoint    │  │              │
                          └─────────────────────┘  └──────────────┘
```

---

## 16. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| PKCE over Implicit Grant | More secure, allows refresh tokens |
| sessionStorage over localStorage | Auto-clear on tab close, less XSS risk |
| 30s polling interval | Within API limits, responsive enough |
| Client-side only | No backend needed, simpler deployment |
| 64px album art | Balance of quality vs bandwidth |
| Component-level error handling | Isolated failures, better UX |
| Visibility API integration | Battery/resource optimization |