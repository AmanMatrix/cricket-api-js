const axios = require("axios");
const cheerio = require("cheerio");
const scrape = require("../scrape");

// 🔥 SYSTEM PROMPT (STRICT JSON OUTPUT)
const SYSTEM_PROMPT = `
You are a cricket data extraction engine.

Your job is to extract ONLY structured cricket match data from given text.

Rules:
- Output MUST be valid JSON only
- No explanation, no extra text
- If any field is missing, return null for that field
- Do NOT hallucinate data
- Prefer scoreboard patterns like "152/3 in 17.2 overs"

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
  "status": ""
}
`;

async function processUrl(url) {
  // ✅ wait for scraping to complete
  let text = await scrape(url);
  // console.log(text)

  const aiResponse = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "nvidia/nemotron-3-super-120b-a12b:free",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: text,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer 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`, // safer
        "Content-Type": "application/json",
      },
    }
  );

  let result;
  try {
    result = JSON.parse(aiResponse.data.choices[0].message.content);
  } catch (e) {
    result = { error: "Invalid JSON from AI", raw: aiResponse.data };
  }

  return result;
}

module.exports = { processUrl };
