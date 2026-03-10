import WebSocket, { WebSocketServer } from "ws";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

const wss = new WebSocketServer({ port: PORT });

console.log("AI Voice Server running on port", PORT);

wss.on("connection", (ws) => {

    console.log("Android gateway connected");

    let audioChunks = [];

    ws.on("message", async (data) => {

        if (typeof data === "string") {

            if (data === "end_of_speech") {

                console.log("Processing audio");

                const audioBuffer = Buffer.concat(audioChunks);
                audioChunks = [];

                try {

                    // 🧠 Speech To Text
                    const stt = await axios.post(
                        "https://api.sarvam.ai/speech-to-text",
                        audioBuffer,
                        {
                            headers: {
                                "api-key": SARVAM_API_KEY,
                                "Content-Type": "audio/wav"
                            }
                        }
                    );

                    const userText = stt.data.text;

                    console.log("User:", userText);

                    // 🤖 Simple AI response (you can replace with LLM later)
                    const aiResponse = "Namaste! Aapne kaha: " + userText;

                    // 🔊 Text To Speech
                    const tts = await axios.post(
                        "https://api.sarvam.ai/text-to-speech",
                        {
                            text: aiResponse,
                            speaker: "meera",
                            language: "hi-IN"
                        },
                        {
                            headers: {
                                "api-key": SARVAM_API_KEY
                            },
                            responseType: "arraybuffer"
                        }
                    );

                    const audio = Buffer.from(tts.data);

                    ws.send(audio);

                } catch (error) {

                    console.error("Sarvam API error:", error.message);

                }

            }

        } else {

            // receive audio from Android
            audioChunks.push(data);

        }

    });

});