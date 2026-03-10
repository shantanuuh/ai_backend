# AI Voice Backend (WebSocket Server)

A robust, production-ready backend designed to stream and process audio chunks from an Android gateway, passing requests to the Sarvam AI API for Speech-to-Text and Text-to-Speech logic.

## Architecture Pipeline

1. **Android Gateway** connects via WebSocket (`ws://<host>`) and begins streaming *16kHz Mono PCM Audio Chunks*.
2. **Buffer Phase:** The WebSocket Server buffers incoming chunks.
3. **End of Speech Signal:** The Android app sends an `end_of_speech` text frame over the WebSocket.
4. **Processing (`src/websocket/session.js`):**
   - Buffers are merged and wrapped with a valid Windows WAV header (`src/utils/pcmToWav.js`).
   - The WAV payload is submitted to the **Sarvam STT API** to get transcriptions.
   - The transcribed text is sent to an **LLM** (`src/services/llm.js`).
   - The resulting response text is synthesized using the **Sarvam TTS API**.
5. **Playback:** The generated TTS audio binary is sent *directly back* over the open WebSocket for Android playback.

## Local Setup

### 1. Configure `.env`
In the root of the project, define the necessary variables:
```ini
PORT=3000
SARVAM_API_KEY=your_sarvam_api_key_here
LOG_LEVEL=info # 'debug' for more verbose traces
```

### 2. Install & Run
```bash
npm install
npm start
```

## Deployment Support (Render)

This application is container-ready. 

**Option 1: Native Node.js Render Web Service**
1. Connect this GitHub Repository.
2. Select **Web Service**.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Emvironment Variables: Add `SARVAM_API_KEY`.

**Option 2: Docker Image (Recommended)**
1. Select "Deploy from a Docker image".
2. Render uses the root `Dockerfile` to automatically build, run, and expose the network port (`PORT 3000`).

## Key Improvements
- **Graceful Error Handling:** Prevents server crashes if the Sarvam API has transient downtime or limits.
- **Connection Recovery:** Ping-Pong mechanisms prevent silent memory leaks by severing dead socket connections automatically.
- **WAV Header Generation:** STT APIS strictly require valid headers; pure PCM byte arrays are natively wrapped without needing external storage tools like `ffmpeg`.
