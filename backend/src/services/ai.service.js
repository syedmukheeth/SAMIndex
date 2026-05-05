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

    // SAFETY: Truncate very large files to avoid API limits
    const truncatedCode = code.length > 5000 ? code.substring(0, 5000) + "\n... [Truncated for AI Analysis]" : code;

    const prompt = `
      Explain this code snippet from "${fileName}" in 2 simple, non-technical sentences.
      Focus only on the purpose of the code.

      CODE:
      ${truncatedCode}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error("Google AI returned an empty response.");
    }

    return text.trim();
  } catch (err) {
    // SENIOR DEV LOGGING: Print the real error to Render logs
    console.error('---------- [NEURAL ERROR REPORT] ----------');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('-------------------------------------------');

    // Return a more descriptive error to the user
    return `AI Error: ${err.message}. Please check Render logs for technical details.`;
  }
};
