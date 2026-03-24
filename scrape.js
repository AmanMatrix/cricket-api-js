const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

async function scrape(url) {
  const browser = await puppeteer.launch({
    headless: true
  });

  const page = await browser.newPage();

  // 👇 Important: real browser headers
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
  );

  console.log("Opening:", url);

  await page.goto(url, {
    waitUntil: "networkidle2",
    timeout: 0
  });

  await new Promise(resolve => setTimeout(resolve, 5000));

  let text = await page.evaluate(() => document.body.innerText);
  text = text
  .replace(/\n+/g, " ")
  .replace(/\s+/g, " ")
  .replace(/(login|signup|advertisement|privacy policy)/gi, "")
  .trim();

  await browser.close();
  return text.slice(0, 1000);
}

module.exports = scrape;