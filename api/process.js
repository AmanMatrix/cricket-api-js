const axios = require("axios");
require("dotenv").config();

const SYSTEM_PROMPT = `
You are a cricket data extraction engine.

Your job is to extract ONLY structured cricket match data from given text.

Rules:
- Output MUST be valid JSON only
- No explanation, no extra text
- If any field is missing, return null for that field
- Do NOT hallucinate data
- Prefer scoreboard patterns like "152/3 in 17.2 overs"
- Also calculate the win probability for the batting team

Extract this EXACT schema:

{
  "team_1": "",
  "team_2": "",
  "batting_team": "",
  "bowling_team": "",
  "score": 0,
  "wickets": 0,
  "overs": 0.0,
  "run_rate": 0.0,
  "target": null,
  "status": "",
  "win_probability":""
}
`;
async function processUrl(url) {
  const scrape = require("../scrape");
  let text = await scrape(url);

  if (!text) return { error: "No text content found" };

  try {
    const aiResponse = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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

    // Regex to find the JSON object inside the string
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");

    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    return { error: "Processing failed", detail: e.message };
  }
}

module.exports = { processUrl };
