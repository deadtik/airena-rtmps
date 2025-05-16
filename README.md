# Airena RTMP Server

A custom RTMP server built with NestJS, NodeMediaServer (NMS), and SQLite. This server supports RTMP streaming, HLS playback, dynamic stream key generation, and now features a fully functional API for stream management.

## Features

- **RTMP Server**: Push streams to the server via RTMP from OBS or other RTMP clients.
- **Stream Key Generation**: Dynamically generate stream keys and stream IDs for secure streaming.
- **HLS Playback**: Serve HLS streams to frontend players.
- **Frontend Integration**: Easy integration for frontend with stream keys.
- **Live Metrics (Coming Soon)**: Real-time metrics for live streams, including viewer count, bitrate, and more.
- **REST API**: Fully implemented API for managing streams, keys, and retrieving stream information.

## Prerequisites

1. **Node.js** (>= v16)
2. **NestJS** for backend API
3. **NodeMediaServer** for RTMP/HLS support
4. **SQLite** for the database (local storage)
5. **OBS or any RTMP-compatible software** to stream

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
