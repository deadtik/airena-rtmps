# Airena RTMP Server

A custom RTMP server built using NestJS, NodeMediaServer (NMS), and SQLite. This server supports RTMP streaming, HLS playback, and dynamic stream key generation for secure streaming.

## Features

- **RTMP Server**: Push streams to the server via RTMP from OBS or other RTMP clients.
- **Stream Key Generation**: Dynamically generate stream keys and stream IDs for secure streaming.
- **HLS Playback**: Serve HLS streams to frontend players.
- **Frontend Integration**: Easy integration for frontend with stream keys.
- **Live Metrics (Coming Soon)**: Real-time metrics for live streams, including viewer count, bitrate, and more.

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
  - **Stream Key**: `test`

### 5. Start Streaming

- Start streaming from OBS.
- Access the HLS stream at `http://localhost:8000/media/index.m3u8` in your browser.



## Upcoming Features

- **Live Metrics**: Real-time analytics for live streams, including:
  - Viewer count
  - Bitrate monitoring
  - Stream health indicators

Stay tuned for updates!

