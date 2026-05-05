const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * @desc    Generate an explanation for a code snippet
 * @param   {string} code - The code snippet to explain
 * @param   {string} fileName - The name of the file
 * @returns {Promise<string>} - The AI generated explanation
 */
exports.explainCode = async (code, fileName) => {
  try {
    const prompt = `
      You are a Senior Software Engineer. Explain the following code snippet from the file "${fileName}" in a concise, high-level way (max 2-3 sentences).
      Focus on what the code does and its role in the application.
      Avoid boilerplate language. Start directly with the explanation.

      CODE:
      ${code}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (err) {
    console.error('[AI Service Error]:', err.message);
    return "Neural analysis currently unavailable. The engine is recalibrating.";
  }
};
