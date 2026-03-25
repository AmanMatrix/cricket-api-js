const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

let browserInstance = null;

async function scrape(url) {
  // Reuse the browser if it exists, otherwise launch it
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: "new", // Uses the faster, more modern headless mode
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
  }

  const page = await browserInstance.newPage();
  
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    console.log("Scraping:", url);

    // networkidle2 is good, but 30s timeout prevents hanging
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for a specific scoreboard element if possible, 
    // otherwise keep a shorter 2s buffer
    await new Promise(resolve => setTimeout(resolve, 2000));

    let text = await page.evaluate(() => document.body.innerText);
    
    text = text
      .replace(/\s+/g, " ")
      .replace(/(login|signup|advertisement|privacy policy|cookie)/gi, "")
      .trim();
    // console.log(text)
    return text.slice(0, 2000); // Increased to 2000 for better context
  } catch (err) {
    console.error("Scrape Error:", err.message);
    return "";
  } finally {
    await page.close(); // Always close the TAB, but keep the browser open
  }
}

module.exports = scrape;