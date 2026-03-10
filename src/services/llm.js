import logger from "../utils/logger.js";

/**
 * Generates an AI response based on the transcribed user text.
 * This is currently a simple fallback logic module.
 * 
 * TODO: Integrate OpenAI / Anthropic / Gemini API here in the future
 * to maintain conversation history and context.
 * 
 * @param {string} userText The transcribed text from the caller.
 * @param {string} sessionId The session ID (to track history if needed).
 * @returns {Promise<string>} The generated response text.
 */
export async function generateResponse(userText, sessionId) {
    logger.info(`Session ${sessionId}: Generating AI response for: "${userText}"`);

    // Basic logic
    if (!userText || userText.trim().length === 0) {
        return "मुझे कुछ सुनाई नहीं दिया, क्या आप फिर से बोल सकते हैं?"; // I didn't hear anything, can you speak again?
    }

    const lowerText = userText.toLowerCase();

    if (lowerText.includes("hello") || lowerText.includes("namaste") || lowerText.includes("hi")) {
        return "नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ?"; // Hello, how can I help you?
    }

    if (lowerText.includes("book") || lowerText.includes("appointment")) {
        return "ज़रूर, मैं आपके लिए अपॉइंटमेंट बुक कर सकता हूँ। कृपया मुझे समय बताएँ।"; // Sure, I can book an appointment for you. Please tell me the time.
    }

    if (lowerText.includes("bye") || lowerText.includes("alvida")) {
        return "धन्यवाद! आपका दिन शुभ हो।"; // Thank you! Have a good day.
    }

    // Default fallback
    return "माफ़ कीजिए, मैं समझ नहीं पाया। " + userText + " - क्या आप इसके बारे में और बता सकते हैं?"; 
}
