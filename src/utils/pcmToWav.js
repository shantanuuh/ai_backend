/**
 * Creates a WAV file header for the given PCM audio parameters.
 * @param {number} dataLength The total length of the raw PCM audio data in bytes.
 * @param {number} sampleRate The sample rate (e.g., 16000).
 * @param {number} numChannels The number of channels (1 for Mono, 2 for Stereo).
 * @param {number} bitsPerSample The bit depth (e.g., 16).
 * @returns {Buffer} The 44-byte WAV header.
 */
export function createWavHeader(dataLength, sampleRate = 16000, numChannels = 1, bitsPerSample = 16) {
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);

    const buffer = Buffer.alloc(44);

    // "RIFF" chunk descriptor
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + dataLength, 4); // Chunk size (36 + SubChunk2Size)
    buffer.write("WAVE", 8);

    // "fmt " sub-chunk
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
    buffer.writeUInt16LE(numChannels, 22); // NumChannels
    buffer.writeUInt32LE(sampleRate, 24); // SampleRate
    buffer.writeUInt32LE(byteRate, 28); // ByteRate
    buffer.writeUInt16LE(blockAlign, 32); // BlockAlign
    buffer.writeUInt16LE(bitsPerSample, 34); // BitsPerSample

    // "data" sub-chunk
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataLength, 40); // Subchunk2Size (data length)

    return buffer;
}

/**
 * Prepends a WAV header to the provided raw PCM buffer.
 * @param {Buffer} pcmBuffer The raw PCM data.
 * @param {number} sampleRate The sample rate (default 16000).
 * @returns {Buffer} A new Buffer containing the WAV header followed by the PCM data.
 */
export function pcmToWav(pcmBuffer, sampleRate = 16000) {
    const header = createWavHeader(pcmBuffer.length, sampleRate);
    return Buffer.concat([header, pcmBuffer]);
}
