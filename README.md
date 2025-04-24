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

