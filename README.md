# airena-rtmps
Steps to get started with our own RTMP module:

=> Run the server in vscode ``npm run start:dev`` 

=> Go to OBS, in Stream change the URL to custom,

type `﻿rtmp://localhost:1935/live` 

StreamKey as ``test`` 

=> Start Streaming.

=> Double tap the batch file that I have created to start ffmpeg and livestreaming. (Creates the files and runs everything at one place)+. 

=> `http://localhost:8000/media/index.m3u8 run` put this into the browser.

=> Might run into a vlc error, dont worry.

Open a new terminal, run `npx serve C:\Airena-RTMP\public -l 8000` 

This gets you another port, free to use.

# Airena RTMP Server

A custom RTMP server using NestJS, NodeMediaServer (NMS), SQLite for storing stream keys and IDs, and serving HLS for frontend playback.

## Features

- **RTMP Server**: Push streams to the server via RTMP from OBS or other RTMP clients.
- **Stream Key Generation**: Dynamically generate stream keys and stream IDs for secure streaming.
- **HLS Playback**: Serve HLS streams to frontend players.
- **Frontend Integration**: Easy integration for frontend with stream keys.

## Prerequisites

1. **Node.js** (>= v16)
2. **NestJS** for backend API
3. **NodeMediaServer** for RTMP/HLS support
4. **SQLite** for the database (local storage)
5. **OBS or any RTMP-compatible software** to stream

## Installation Steps

### 1. Clone the repository

```bash
git clone https://your-repository-url.git
cd airena-rtmp

