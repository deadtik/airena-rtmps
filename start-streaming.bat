@echo off
SETLOCAL ENABLEDELAYEDEXPANSION

REM === CONFIG ===
set RTMP_URL=rtmp://localhost/live/test
set HLS_OUTPUT=C:\Users\kumar\OneDrive\Desktop\airena-rtmps\public\media\index.m3u8
set VLC_PATH="C:\Program Files\VideoLAN\VLC\vlc.exe"
set FFMPEG_PATH=ffmpeg

REM === Wait for RTMP Stream ===
echo [INFO] Waiting for RTMP stream to become available...
:check
ffprobe -v error -show_streams -i %RTMP_URL% >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 2 >nul
    goto check
)

echo [INFO] RTMP stream is live. Starting FFmpeg...

REM === Start FFmpeg ===
start "FFmpeg-HLS" %FFMPEG_PATH% -i %RTMP_URL% -c:v copy -c:a aac -f hls -hls_time 10 -hls_list_size 6 -hls_flags independent_segments %HLS_OUTPUT%

REM === Wait for HLS Manifest to Appear ===
echo [INFO] Waiting for HLS playlist (index.m3u8) to be generated...
:wait_hls
if not exist "%HLS_OUTPUT%" (
    timeout /t 2 >nul
    goto wait_hls
)

REM === Start VLC to Play Stream ===
echo [INFO] Opening VLC player...
start "" %VLC_PATH% http://localhost:8000/media/index.m3u8

echo [SUCCESS] Stream is live in VLC!