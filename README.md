# Airena RTMP Server

A custom RTMP server built with NestJS, NodeMediaServer (NMS), and SQLite. This server supports RTMP streaming, HLS playback, dynamic stream key generation, and now features a fully functional API for stream management.

## Features

- **RTMP Server**: Push streams to the server via RTMP from OBS or other RTMP clients.
- **Stream Key Generation**: Dynamically generate stream keys and stream IDs for secure streaming.
- **HLS Playback**: Serve HLS streams to frontend players.
- **Frontend Integration**: Easy integration for frontend with stream keys.
- **Live Stream Metrics**: Real-time metrics (bitrate, processing latency, estimated bandwidth) for live streams, calculated via FFmpeg and broadcast over WebSockets.
- **VOD Recording**: Automatic recording of live streams to MP4 files.
- **REST API**: Comprehensive API for managing stream keys, retrieving stream/VOD information, and updating settings.
- **WebSocket API**: For broadcasting live stream metrics.

## Prerequisites

1. **Node.js** (>= v16)
2. **NestJS** for backend API
3. **NodeMediaServer** for RTMP/HLS support
4. **SQLite** for the database (local storage)
5. **OBS (or any RTMP-compatible software)** to stream to the server.
6. **FFmpeg**: Required for generating HLS, recording VODs, and calculating live metrics. Ensure FFmpeg is installed on the server where this application runs and is accessible via the system's PATH, or specify its location using the `FFMPEG_PATH` environment variable.

## Installation Steps

### 1. Clone the repository

```bash
git clone https://github.com/deadtik/airena-rtmps.git
cd airena-rtmps
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run start:dev
```

### 4. Configure OBS

- In OBS, go to **Settings > Stream**.
- Set the **Stream Type** to `Custom`.
- Enter the following details:
  - **URL**: `rtmp://localhost:1935/live`
  - **Stream Key**: Obtain a stream key via the API or use a test key.

### 5. Start Streaming

- Start streaming from OBS.
- Access the HLS stream at `http://localhost:8000/media/index.m3u8` in your browser.

### 6. Using the API

- The REST API is up and running.
- Use the API to generate stream keys, manage streams, and retrieve stream information.
- Refer to the API documentation or `/api` endpoint for available routes and usage.

## Upcoming Features

- **Live Metrics**: Real-time analytics for live streams, including:
  - Viewer count
  - Bitrate monitoring
  - Stream health indicators

Stay tuned for updates!

## Configuration: Environment Variables

This application is configured using environment variables. For local development, you can create a `.env` file in the root of the project to store these variables. In production, these should be set in your deployment environment.

| Variable         | Description                                                                 | Example Value                     | Default Value        |
|------------------|-----------------------------------------------------------------------------|-----------------------------------|----------------------|
| `PORT`           | The port the main application will listen on.                               | `3000`                            | `3000`               |
| `FFMPEG_PATH`    | Path to the FFmpeg executable.                                              | `/usr/bin/ffmpeg` or `C:/ffmpeg/bin/ffmpeg.exe` | `ffmpeg`             |
| `RTMP_BASE_URL`  | Base URL for the RTMP server where streams are pushed.                      | `rtmp://yourdomain.com:1935`      | `rtmp://localhost:1935` |
| `HLS_BASE_URL`   | Base URL for the HLS server from where streams are played.                  | `http://yourdomain.com:8000`      | `http://localhost:8000` |
| `MEDIA_ROOT`     | Root directory for storing media files (HLS segments, VODs).                | `./media_files`                   | `./media`            |
| `VOD_DIRECTORY_NAME` | Name of the subdirectory within `MEDIA_ROOT` to store VOD files.        | `recordings`                      | `vod`                |
| `CLERK_SECRET_KEY` | Your Clerk secret key for authentication.                                   | `sk_test_xxxxxxxxxxxxxxxxxxxx`    |                      |
| `DATABASE_URL`   | Path to the SQLite database file.                                           | `./data/streaming.db`            | `./data/streaming.db` |

**Note:** For `FFMPEG_PATH`, if FFmpeg is in your system's PATH, you can often leave it as the default `ffmpeg`. Otherwise, provide the full path to the executable.

## WebSocket API

The server provides real-time updates for stream metrics via WebSockets.

### Connecting

Connect to the WebSocket server at the application's base URL (e.g., `ws://localhost:3000` or `wss://yourdomain.com`). The WebSocket gateway is typically available on the same port as the HTTP server.

### Receiving Metrics Updates

Listen for the `metricsUpdate` event. This event is emitted globally whenever metrics for any active stream are updated.

**Event:** `metricsUpdate`

**Payload:**
```json
{
  "streamKey": "your_stream_key",
  "bitrate": 5000,       // Current bitrate in Kbps
  "bandwidth": 6000,     // Estimated required bandwidth in Kbps
  "latency": 120,        // FFmpeg processing latency in ms (lower is better)
  "lastUpdated": 1678886400000 // Timestamp of the last update (milliseconds since epoch)
}
```
- `streamKey` (string): The unique key of the stream these metrics belong to.
- `bitrate` (number): The current video bitrate in Kilobits per second (Kbps).
- `bandwidth` (number): An estimated network bandwidth in Kbps required to sustain the current bitrate (typically bitrate * 1.2).
- `latency` (number): The processing latency reported by the FFmpeg stats process in milliseconds. This is an indicator of the FFmpeg process's health on the server, not end-to-end stream latency.
- `lastUpdated` (number): A Unix timestamp (in milliseconds) indicating when these metrics were last updated on the server.

## REST API Endpoints

The API provides endpoints for managing streams, VODs, and retrieving stream information. All API routes are prefixed with `/api`.

### Authentication

Endpoints marked with **🔒 Authenticated** require a valid JWT token from Clerk in the `Authorization: Bearer <token>` header. Other endpoints are public.

---

### Stream Module (`/api/stream`)

#### 1. Get or Create Stream Key, Stream URL, and HLS URL
- **Method & Path:** `GET /api/stream/key`
- **Description:** Retrieves the current user's stream key, RTMP stream URL, and HLS playback URL. If the user doesn't have a stream key, a new one is generated and associated with their Clerk ID.
- **Authentication:** 🔒 Authenticated (Clerk JWT)
- **Path Parameters:** None
- **Request Body:** None
- **Success Response (200 OK):**
  ```json
  {
    "streamKey": "sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "streamUrl": "rtmp://localhost:1935/live/sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "hlsUrl": "http://localhost:8000/live/sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/index.m3u8"
  }
  ```
- **Error Responses:**
    - `401 Unauthorized`: If the JWT is missing or invalid.

#### 2. Start a Stream
- **Method & Path:** `POST /api/stream/start/:streamKey`
- **Description:** Notifies the server that a stream with the given key is about to start. This is typically called by the RTMP client or streaming software via a webhook or manually if needed, though NMS handles stream starts automatically on publish. This endpoint mainly updates the internal state.
- **Authentication:** 🔒 Authenticated (Clerk JWT)
- **Path Parameters:**
    - `:streamKey` (string): The user's stream key.
- **Request Body:** None
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Stream started successfully",
    "streamUrl": "rtmp://localhost:1935/live/sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "hlsUrl": "http://localhost:8000/live/sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/index.m3u8"
  }
  ```
- **Error Responses:**
    - `401 Unauthorized`: If the JWT is missing or invalid.
    - `404 Not Found`: If the stream key does not match the authenticated user.

#### 3. Stop a Stream
- **Method & Path:** `POST /api/stream/stop/:streamKey`
- **Description:** Notifies the server that a stream has stopped. This is typically called by the RTMP client or streaming software, though NMS handles stream stops automatically on unpublish. This endpoint mainly updates the internal state.
- **Authentication:** 🔒 Authenticated (Clerk JWT)
- **Path Parameters:**
    - `:streamKey` (string): The user's stream key.
- **Request Body:** None
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Stream stopped successfully"
  }
  ```
- **Error Responses:**
    - `401 Unauthorized`: If the JWT is missing or invalid.
    - `404 Not Found`: If the stream key does not match the authenticated user.

#### 4. List User Streams
- **Method & Path:** `GET /api/stream/list`
- **Description:** Retrieves a list of streams associated with the authenticated user, along with their current status and metrics.
- **Authentication:** 🔒 Authenticated (Clerk JWT)
- **Path Parameters:** None
- **Request Body:** None
- **Success Response (200 OK):**
  ```json
  {
    "streams": [
      {
        "streamKey": "sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "streamUrl": "rtmp://localhost:1935/live/sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "hlsUrl": "http://localhost:8000/live/sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/index.m3u8",
        "isLive": true,
        "metrics": {
          "bitrate": 3000,
          "latency": 150,
          "bandwidth": 3600
        },
        "settings": {
          "quality": "1080p",
          "maxBitrate": 6000,
          "resolution": "1920x1080"
        }
      }
    ]
  }
  ```
- **Error Responses:**
    - `401 Unauthorized`: If the JWT is missing or invalid.
    - `404 Not Found`: If the user is not found (should not happen if authenticated).

#### 5. Get Stream Details
- **Method & Path:** `GET /api/stream/details/:streamKey`
- **Description:** Retrieves detailed information about a specific stream, including its status, metrics, and settings.
- **Authentication:** 🔒 Authenticated (Clerk JWT) - User can only access their own stream details.
- **Path Parameters:**
    - `:streamKey` (string): The stream key.
- **Request Body:** None
- **Success Response (200 OK):**
  ```json
  {
    "streamKey": "sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "streamUrl": "rtmp://localhost:1935/live/sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "hlsUrl": "http://localhost:8000/live/sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/index.m3u8",
    "isLive": true,
    "metrics": {
      "bitrate": 3000,
      "latency": 150,
      "bandwidth": 3600
    },
    "settings": {
      "quality": "1080p",
      "maxBitrate": 6000,
      "resolution": "1920x1080"
    },
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
  ```
- **Error Responses:**
    - `401 Unauthorized`: If the JWT is missing or invalid.
    - `404 Not Found`: If the stream key does not belong to the authenticated user or is not found.

#### 6. Get Stream Status (Public)
- **Method & Path:** `GET /api/stream/status/:streamKey`
- **Description:** Retrieves the live status and basic metrics for a given stream key. This endpoint is public.
- **Authentication:** Public
- **Path Parameters:**
    - `:streamKey` (string): The stream key.
- **Request Body:** None
- **Success Response (200 OK):**
  ```json
  {
    "isLive": true,
    "bitrate": 3000,
    "latency": 150,
    "bandwidth": 3600
  }
  ```
- **Error Responses:**
    - `404 Not Found`: If the stream key is not found.

#### 7. Get Stream Statistics (Public)
- **Method & Path:** `GET /api/stream/metrics/:streamKey`
- **Description:** Retrieves more detailed statistics for a given stream key, including bitrate, FPS (placeholder), resolution, and viewer counts (placeholders). This endpoint is public.
- **Authentication:** Public
- **Path Parameters:**
    - `:streamKey` (string): The stream key.
- **Request Body:** None
- **Success Response (200 OK):**
  ```json
  {
    "bitrate": 3000,
    "fps": 0,
    "resolution": "1920x1080",
    "totalViewers": 0,
    "peakViewers": 0
  }
  ```
- **Error Responses:**
    - `404 Not Found`: If the stream key is not found.

#### 8. Update Stream Settings
- **Method & Path:** `POST /api/stream/settings/:streamKey`
- **Description:** Updates settings for a specific stream, such as quality, max bitrate, or resolution.
- **Authentication:** 🔒 Authenticated (Clerk JWT)
- **Path Parameters:**
    - `:streamKey` (string): The user's stream key.
- **Request Body:**
  ```json
  {
    "quality": "720p",
    "maxBitrate": 4000,
    "resolution": "1280x720"
  }
  ```
  (All fields are optional)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Stream settings updated successfully",
    "settings": {
      "quality": "720p",
      "maxBitrate": 4000,
      "resolution": "1280x720"
    }
  }
  ```
- **Error Responses:**
    - `400 Bad Request`: If the request body is invalid.
    - `401 Unauthorized`: If the JWT is missing or invalid.
    - `404 Not Found`: If the stream key does not match the authenticated user.

#### 9. Regenerate Stream Key
- **Method & Path:** `DELETE /api/stream/key/:streamKey`
- **Description:** Invalidates the current stream key and generates a new one for the user. This is useful if a stream key is compromised.
- **Authentication:** 🔒 Authenticated (Clerk JWT)
- **Path Parameters:**
    - `:streamKey` (string): The user's current (soon to be old) stream key.
- **Request Body:** None
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Stream key regenerated successfully",
    "newStreamKey": "sk_newxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "newStreamUrl": "rtmp://localhost:1935/live/sk_newxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "hlsUrl": "http://localhost:8000/live/sk_newxxxxxxxxxxxxxxxxxxxxxxxxxxxx/index.m3u8"
  }
  ```
- **Error Responses:**
    - `401 Unauthorized`: If the JWT is missing or invalid.
    - `404 Not Found`: If the stream key does not match the authenticated user.

---

### VOD (Video On Demand) Module (`/api/vod`)

All VOD endpoints are currently public. Authentication could be added if private VOD access is required.

#### 1. List Available VODs
- **Method & Path:** `GET /api/vod/list`
- **Description:** Retrieves a list of all available VOD filenames.
- **Authentication:** Public
- **Path Parameters:** None
- **Request Body:** None
- **Success Response (200 OK):**
  ```json
  [
    "streamkey1-2023-10-27T10-30-00Z.mp4",
    "streamkey2-2023-10-28T12-00-00Z.mp4"
  ]
  ```
- **Error Responses:** None specific, usually 200 OK with an empty array if no VODs.

#### 2. Get VOD File
- **Method & Path:** `GET /api/vod/file/:filename`
- **Description:** Serves a specific VOD file for download or streaming playback.
- **Authentication:** Public
- **Path Parameters:**
    - `:filename` (string): The filename of the VOD (e.g., `streamkey1-2023-10-27T10-30-00Z.mp4`).
- **Request Body:** None
- **Success Response (200 OK with `video/mp4` content type):**
  The raw video file.
- **Error Responses:**
    - `400 Bad Request`: If the filename is invalid or a path traversal attempt is detected.
    - `404 Not Found`: If the VOD filename does not exist or is not a regular file.
    - `500 Internal Server Error`: If there's an issue during file download (e.g., reading the file after headers sent).

#### 3. Get VOD Details (Information)
- **Method & Path:** `GET /api/vod/details/:filename`
- **Description:** Retrieves metadata or information about a specific VOD file (e.g., size, duration - currently placeholder).
- **Authentication:** Public
- **Path Parameters:**
    - `:filename` (string): The filename of the VOD.
- **Request Body:** None
- **Success Response (200 OK):**
  ```json
  {
    "filename": "streamkey1-2023-10-27T10-30-00Z.mp4",
    "size": 104857600, // Example size in bytes
    "duration": "01:23:45" // Example duration
    // More details can be added here in the future
  }
  ```
  (Note: The actual implementation for VOD size/duration in `getVodDetails` might be basic. For more detailed metadata, integration with a tool like `ffprobe` would be necessary in the future.)
- **Error Responses:**
    - `404 Not Found`: If the VOD filename does not exist.
