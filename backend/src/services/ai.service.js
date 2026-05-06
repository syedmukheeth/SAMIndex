const axios = require("axios");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

/**
 * @desc    Get the appropriate AI provider based on the API Key
 * @returns {Object} - { provider: 'gemini' | 'nvidia', apiKey: string }
 */
const getAIProvider = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("AI API Key (GEMINI_API_KEY) is missing from environment variables.");
  }

  const cleanKey = apiKey.trim().replace(/[\n\r]/g, '');
  
  // NVIDIA keys usually start with 'nvapi-'
  if (cleanKey.startsWith('nvapi-')) {
    return { provider: 'nvidia', apiKey: cleanKey };
  }
  
  // Default to Gemini
  return { provider: 'gemini', apiKey: cleanKey };
};

/**
 * @desc    Generate a robust explanation for a code snippet
 * @param   {string} code - The code snippet to explain
 * @param   {string} fileName - The name of the file
 * @returns {Promise<string>} - The AI generated explanation
 */
exports.explainCode = async (code, fileName) => {
  try {
    const { provider, apiKey } = getAIProvider();
    const truncatedCode = code.length > 6000 ? code.substring(0, 6000) + "\n... [Truncated for Neural Analysis]" : code;

    console.log(`[AI ENGINE]: Initiating analysis for ${fileName} via ${provider.toUpperCase()}...`);

    if (provider === 'nvidia') {
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
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.choices[0]?.message?.content?.trim() || "NVIDIA returned an empty response.";
    } else {
      // Gemini Implementation
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are a senior software architect. Explain this code from "${fileName}" clearly in 2 simple, non-technical sentences. Focus on the core purpose and function:\n\n\`\`\`\n${truncatedCode}\n\`\`\``;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    }

  } catch (err) {
    console.error('---------- [AI ENGINE ERROR] ----------');
    const errorMsg = err.response?.data?.message || err.message;
    console.error('Reason:', errorMsg);
    console.error('---------------------------------------');
    return `Neural Analysis Offline: ${errorMsg}`;
  }
};

/**
 * @desc    Generate a high-level summary of a repository based on its README or file list
 * @param   {string} content - README content or file structure
 * @param   {string} repoName - Name of the repo
 * @returns {Promise<string>} - The AI generated summary
 */
exports.summarizeRepository = async (content, repoName) => {
  try {
    const { provider, apiKey } = getAIProvider();
    const truncatedContent = content.substring(0, 8000);

    console.log(`[AI ENGINE]: Summarizing workspace ${repoName} via ${provider.toUpperCase()}...`);

    if (provider === 'nvidia') {
      const response = await axios.post(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        {
          model: "meta/llama-3.1-70b-instruct",
          messages: [
            {
              role: "system",
              content: "You are a lead technical product manager. Summarize the repository in one punchy, professional sentence (max 20 words) that describes its value proposition. Start with a verb."
            },
            {
              role: "user",
              content: `Summarize this repository named "${repoName}" based on its README/content:\n\n${truncatedContent}`
            }
          ],
          temperature: 0.5,
          max_tokens: 100,
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.choices[0]?.message?.content?.trim() || "Workspace analysis complete.";
    } else {
      // Gemini Implementation
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are a lead technical product manager. Summarize the repository "${repoName}" in one punchy, professional sentence (max 20 words) that describes its value proposition. Start with a verb. Base it on this content:\n\n${truncatedContent}`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    }
  } catch (err) {
    console.error('[AI SUMMARY ERROR]:', err.message);
    return "Workspace analyzed and context established for deep search.";
  }
};
