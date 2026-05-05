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

    // Initialize inside the call to ensure it has the latest ENV vars
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Explain this code snippet from "${fileName}" in 2 simple, non-technical sentences.
      Focus only on the purpose of the code.

      CODE:
      ${code}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (err) {
    console.error('[AI SERVICE ERROR]:', err.message);
    return "AI analysis failed. Please check if GEMINI_API_KEY is set in your environment (Render/Vercel).";
  }
};
