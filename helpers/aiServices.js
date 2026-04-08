const axios = require("axios");

class AIService {
  async callZAI(prompt) {
    try {
      console.log("ZAI_API_KEY:", process.env.ZAI_API_KEY);

      const response = await axios.post(
        "https://api.lingyiwanwu.com/v1/chat/completions",
        {
          model: "yi-medium",
          messages: [{ role: "user", content: prompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.ZAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error("Error calling ZAI API:", error.response?.data || error.message);
      return "Error calling ZAI API";
    }
  }

  async callGemini(prompt) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        },
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      const candidate = response.data.candidates?.[0];
      if (!candidate?.content?.parts?.[0]?.text) {
        console.error("Unexpected Gemini response structure:", response.data);
        return "No response content from Gemini";
      }
      return candidate.content.parts[0].text;
    } catch (error) {
      console.error(
        "Error calling Gemini API:",
        error.response?.data || error.message,
      );
      return "Error calling Gemini API";
    }
  }

  async callOpenAI(prompt) {
    try {
      console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY);

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
        },
        {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        },
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error(
        "Error calling OpenAI API:",
        error.response?.data || error.message,
      );
      return "Error calling OpenAI API";
    }
  }
}

module.exports = new AIService();
