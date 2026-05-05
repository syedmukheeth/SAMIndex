const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

/**
 * @desc    Generate a robust explanation for a code snippet using NVIDIA NIM (Llama 3)
 * @param   {string} code - The code snippet to explain
 * @param   {string} fileName - The name of the file
 * @returns {Promise<string>} - The AI generated explanation
 */
exports.explainCode = async (code, fileName) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("NVIDIA API Key (GEMINI_API_KEY) is missing from environment variables.");
    }

    // SENIOR DEV FIX: Sanitize the key to remove any accidental whitespace
    const cleanKey = apiKey.trim().replace(/[\n\r]/g, '');
    
    // SAFETY: Truncate very large files
    const truncatedCode = code.length > 6000 ? code.substring(0, 6000) + "\n... [Truncated for Neural Analysis]" : code;

    console.log(`[NVIDIA NEURAL LINK]: Initiating analysis for ${fileName}...`);

    const response = await axios.post(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        model: "meta/llama-3.1-70b-instruct",
        messages: [
          {
            role: "system",
            content: "You are a senior software architect. Explain code snippets clearly in 2 simple, non-technical sentences. Focus on the core purpose and function."
          },
          {
            role: "user",
            content: `Explain this code from "${fileName}":\n\n\`\`\`\n${truncatedCode}\n\`\`\``
          }
        ],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
      },
      {
        headers: {
          "Authorization": `Bearer ${cleanKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const explanation = response.data.choices[0]?.message?.content;

    if (!explanation) {
      throw new Error("NVIDIA NIM returned an empty response.");
    }

    console.log(`[AI SUCCESS]: Robust analysis complete for ${fileName}`);
    return explanation.trim();

  } catch (err) {
    // SENIOR DEV LOGGING
    console.error('---------- [NVIDIA NEURAL ERROR] ----------');
    const errorMsg = err.response?.data?.message || err.message;
    console.error('Reason:', errorMsg);
    if (err.response?.status === 401) {
      console.error('FIX: Your NVIDIA API key is invalid or expired.');
    }
    console.error('-------------------------------------------');

    return `Neural Analysis Offline: ${errorMsg}. Please verify your NVIDIA API Key in Render.`;
  }
};
