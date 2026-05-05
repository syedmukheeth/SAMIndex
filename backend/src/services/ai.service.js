const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

/**
 * @desc    Generate an explanation for a code snippet
 * @param   {string} code - The code snippet to explain
 * @param   {string} fileName - The name of the file
 * @returns {Promise<string>} - The AI generated explanation
 */
exports.explainCode = async (code, fileName) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing from environment variables.");
    }

    // SENIOR DEV FIX: Sanitize the key to remove any accidental newlines or spaces
    const cleanKey = apiKey.trim().replace(/[\n\r]/g, '');
    
    // Force stable v1 API version if possible via the constructor or model calls
    const genAI = new GoogleGenerativeAI(cleanKey);
    
    // SAFETY: Truncate very large files to avoid API limits
    const truncatedCode = code.length > 5000 ? code.substring(0, 5000) + "\n... [Truncated for AI Analysis]" : code;

    const prompt = `
      Explain this code snippet from "${fileName}" in 2 simple, non-technical sentences.
      Focus only on the purpose of the code.

      CODE:
      ${truncatedCode}
    `;

    // Multi-model fallback strategy with version forcing
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[AI NEURAL LINK]: Attempting connection with ${modelName} (v1)...`);
        
        // Some SDK versions support passing options here
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          apiVersion: 'v1' 
        });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        if (text) {
          console.log(`[AI SUCCESS]: Established stable link with ${modelName}`);
          return text.trim();
        }
      } catch (err) {
        console.error(`[AI FAILOVER]: ${modelName} node rejected. Reason: ${err.message}`);
        lastError = err;
        continue; 
      }
    }

    throw lastError || new Error("All neural nodes failed to respond.");
  } catch (err) {
    console.error('---------- [NEURAL ERROR REPORT] ----------');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('-------------------------------------------');

    return `AI Error: ${err.message}. Please check your GEMINI_API_KEY and API restrictions.`;
  }
};
