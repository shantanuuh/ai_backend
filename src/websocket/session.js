import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.js";
import { transcribeAudio, synthesizeSpeech } from "../services/sarvam.js";
import { generateResponse } from "../services/llm.js";

const MAX_BUFFER_SIZE = 5 * 1024 * 1024; // 5MB limit to prevent memory exhaustion

/**
 * Handles an individual Android caller's WebSocket session.
 */
export class VoiceSession {
    constructor(ws) {
        this.id = uuidv4();
        this.ws = ws;
        this.audioChunks = [];
        this.totalAudioBytes = 0;
        this.isProcessing = false;

        logger.info(`Session ${this.id}: New Android Gateway connected.`);

        this.setupListeners();
    }

    setupListeners() {
        this.ws.on("message", this.processMessage.bind(this));
        
        this.ws.on("close", (code, reason) => {
            logger.info(`Session ${this.id}: Connection closed. Code: ${code}, Reason: ${reason}`);
            this.cleanup();
        });

        this.ws.on("error", (err) => {
            logger.error(`Session ${this.id}: WebSocket error: ${err.message}`);
        });
    }

    async processMessage(data) {
        if (typeof data === "string") {
            // Android gateway sent a control message
            if (data === "end_of_speech") {
                await this.handleEndOfSpeech();
            } else {
                logger.warn(`Session ${this.id}: Unknown string message received: ${data}`);
            }
        } else if (Buffer.isBuffer(data)) {
            // Incoming audio chunk
            if (this.isProcessing) {
                // Ignore audio while we are actively generating/speaking unless we want full duplex interruptibility
                return;
            }

            if (this.totalAudioBytes + data.length > MAX_BUFFER_SIZE) {
                logger.warn(`Session ${this.id}: Buffer limit reached. Truncating incoming audio.`);
                return;
            }

            this.audioChunks.push(data);
            this.totalAudioBytes += data.length;
        } else {
            logger.warn(`Session ${this.id}: Received unsupported data format (not string or buffer).`);
        }
    }

    async handleEndOfSpeech() {
        if (this.audioChunks.length === 0) {
            logger.debug(`Session ${this.id}: 'end_of_speech' received but buffer is empty. Skipping.`);
            return;
        }

        this.isProcessing = true;
        
        logger.info(`Session ${this.id}: Processing ${this.totalAudioBytes} bytes of audio.`);
        
        // Deep copy and reset buffer quickly so we don't accidentally mix chunks
        const audioBuffer = Buffer.concat(this.audioChunks);
        this.audioChunks = [];
        this.totalAudioBytes = 0;

        try {
            // 1. Speech to Text
            logger.debug(`Session ${this.id}: -> Transcribing...`);
            const userText = await transcribeAudio(audioBuffer);
            
            if (!userText || userText.trim().length === 0) {
                logger.info(`Session ${this.id}: No text detected in audio.`);
                this.isProcessing = false;
                return; // Optionally send back a "Please repeat" TTS here.
            }

            logger.info(`Session ${this.id}: Caller said: "${userText}"`);

            // 2. Generate LLM Response
            logger.debug(`Session ${this.id}: -> Generating reply...`);
            const aiResponseText = await generateResponse(userText, this.id);
            logger.info(`Session ${this.id}: AI Replied: "${aiResponseText}"`);

            // 3. Text to Speech
            logger.debug(`Session ${this.id}: -> Synthesizing speech...`);
            const ttsBuffer = await synthesizeSpeech(aiResponseText);
            
            // 4. Send back to Android
            if (this.ws.readyState === this.ws.OPEN) {
                logger.info(`Session ${this.id}: Sending TTS audio to client (${ttsBuffer.length} bytes).`);
                this.ws.send(ttsBuffer);
            } else {
                logger.warn(`Session ${this.id}: Cannot send TTS; socket is not open.`);
            }

        } catch (error) {
            logger.error(`Session ${this.id}: Pipeline error -> ${error.message}`);
            
            // Send error fallback audio if possible (requires pre-recorded fallback buffer or simple TTS)
            // For now, silently drop and allow them to speak again
        } finally {
            this.isProcessing = false;
        }
    }

    cleanup() {
        this.audioChunks = [];
        this.totalAudioBytes = 0;
        this.isProcessing = false;
    }
}
