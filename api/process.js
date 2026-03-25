const { processUrl } = require("../lib/process");

export default async function handler(req, res) {
  // 1. Handle CORS for Shorya's Frontend / Supabase Edge Functions
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // 2. Reject non-POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // 3. Extract payload
  const { url, prompt, model } = req.body;

  if (!url || !prompt) {
    return res.status(400).json({ error: "Both 'url' and 'prompt' are required." });
  }

  try {
    console.log(`[VERCEL API] Processing request for: ${url}`);
    
    // Call your existing logic
    const result = await processUrl(url, prompt, model);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("[VERCEL API ERROR]", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}