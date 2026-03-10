import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import logger from "../utils/logger.js";
import { pcmToWav } from "../utils/pcmToWav.js";

dotenv.config();

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

if (!SARVAM_API_KEY) {
    logger.error("SARVAM_API_KEY is not set in the environment variables!");
}

/**
 * Sends a PCM buffer to Sarvam STT.
 * @param {Buffer} pcmBuffer The raw 16kHz Mono PCM buffer.
 * @returns {Promise<string>} The transcribed text.
 */
export async function transcribeAudio(pcmBuffer) {
    logger.info(`Starting transcription for audio of size: ${pcmBuffer.length} bytes`);
    
    // Add WAV header so the API accepts the file correctly
    const wavBuffer = pcmToWav(pcmBuffer);
    
    // Create form data payload (Sarvam STT often expects multipart/form-data for audio uploads)
    const formData = new FormData();
    formData.append("file", wavBuffer, {
        filename: "audio.wav",
        contentType: "audio/wav",
    });

    // Alternatively, if the API strictly accepts raw bytes in the body:
    // Some versions accept binary body with Content-Type: audio/wav
    try {
        const response = await axios.post(
            "https://api.sarvam.ai/speech-to-text",
            formData, // If using form-data, Axios automatically sets proper headers including boundaries
            {
                headers: {
                    "api-key": SARVAM_API_KEY,
                    ...formData.getHeaders(),
                },
                timeout: 10000 // 10s timeout
            }
        );

        const text = response.data?.text || response.data?.transcript || "";
        logger.info(`Transcription success: "${text}"`);
        return text;
    } catch (error) {
        // Fallback or retry logic can be implemented here
        const errorMsg = error.response?.data || error.message;
        logger.error(`Sarvam STT Failed: ${JSON.stringify(errorMsg)}`);
        throw new Error("Failed to transcribe audio.");
    }
}

/**
 * Sends text to Sarvam TTS to generate speech.
 * @param {string} text The text to synthesize.
 * @param {string} language The language code (e.g., "hi-IN", "en-IN").
 * @returns {Promise<Buffer>} The resulting audio buffer.
 */
export async function synthesizeSpeech(text, language = "hi-IN") {
    logger.info(`Starting synthesis for text: "${text}" in ${language}`);

    try {
        const response = await axios.post(
            "https://api.sarvam.ai/text-to-speech",
            {
                inputs: [text], // Check the exact JSON payload expected by Sarvam - sometimes it takes an array of texts
                target_language_code: language,
                speaker: "meera",
                pitch: 0,
                pace: 1.0,
                loudness: 1.5,
                speech_sample_rate: 16000,
                enable_preprocessing: true,
                model: "tts"
            },
            {
                headers: {
                    "api-key": SARVAM_API_KEY,
                    "Content-Type": "application/json"
                },
                responseType: "arraybuffer", // Important for receiving binary audio
                timeout: 10000
            }
        );
        
        // Note: Check the Sarvam API documentation to see what the direct response looks like. 
        // If it returns a json containing a base64 string, you must decode it:
        // const audioBase64 = response.data.audios[0];
        // return Buffer.from(audioBase64, "base64");
        // We will assume it returns binary arraybuffer directly as requested by previous codebase or a JSON containing base64.
        
        if (response.headers["content-type"] && response.headers["content-type"].includes("application/json")) {
             // Let's decode if it's JSON
             const data = JSON.parse(Buffer.from(response.data).toString('utf-8'));
             if (data.audios && data.audios.length > 0) {
                 logger.info("Synthesis success. Extracted base64 audio.");
                 return Buffer.from(data.audios[0], "base64");
             } else {
                 throw new Error("Unexpected JSON response structure from Sarvam TTS.");
             }
        }
        
        // Otherwise, it's raw binary arraybuffer (e.g., wav)
        logger.info("Synthesis success. Received binary audio.");
        return Buffer.from(response.data);

    } catch (error) {
        const errorMsg = error.response ? Buffer.from(error.response.data).toString('utf-8') : error.message;
        logger.error(`Sarvam TTS Failed: ${errorMsg}`);
        throw new Error("Failed to synthesize speech.");
    }
}
