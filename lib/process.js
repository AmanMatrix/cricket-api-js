const axios = require("axios");
const scrape = require("./scrape"); // Ensure this path correctly points to your scrape.js
require("dotenv").config();

async function processUrl(url, customPrompt, aiModel = "nvidia/nemotron-3-super-120b-a12b:free") {
  console.log(`\n[PROCESS] Initiating scrape for: ${url}`);

  // 1. Scrape the raw text
  let text = await scrape(url);

  if (!text || text.trim() === "") {
    console.error("[PROCESS ERROR] Scraping returned empty content.");
    return { error: "No text content found or site blocked the scraper." };
  }

  console.log(`[PROCESS] Scrape successful. Grabbed ${text.length} characters. Sending to AI...`);

  // 2. Send to OpenRouter
  try {
    const aiResponse = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: aiModel,
        // Temperature 0 forces the AI to be as deterministic and factual as possible (best for JSON)
        temperature: 0,
        messages: [
          { role: "system", content: customPrompt },
          { role: "user", content: text },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const rawContent = aiResponse.data.choices[0].message.content;
    console.log(`[PROCESS] AI Response received. Parsing JSON...`);

    // 3. Extract JSON cleanly
    // AI models often wrap JSON in markdown (e.g., ```json ... ```) or add conversational text.
    // This regex hunts down the first { and the last } to extract only the object.
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("[PROCESS ERROR] No JSON found in AI response. Raw output:", rawContent);
      throw new Error("No JSON object found in AI response");
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    console.log("[PROCESS] Successfully parsed JSON data.");

    return parsedData;
  } catch (e) {
    console.error("\n[PROCESS ERROR] AI API or Parsing failed:", e.message);

    // Fallback error response format so the server doesn't crash
    return {
      error: "Processing pipeline failed",
      detail: e.response?.data?.error?.message || e.message,
    };
  }
}

module.exports = { processUrl };
