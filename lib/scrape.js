const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

let browserInstance = null;
let browserPromise = null;

const isLocal = !process.env.VERCEL_ENV && !process.env.AWS_EXECUTION_ENV;

async function scrape(url) {
  console.log(`\n[DEBUG] Scraper initiated for URL: ${url}`);
  
  if (!browserInstance) {
    if (!browserPromise) {
      console.log("[DEBUG] Booting new Browser...");
      
      let executablePath = isLocal 
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" 
        : await chromium.executablePath();

      browserPromise = puppeteer.launch({
        args: isLocal ? puppeteer.defaultArgs() : chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: isLocal ? "new" : chromium.headless,
        ignoreHTTPSErrors: true,
      }).then(browser => {
        browserInstance = browser;
        browserPromise = null; 
        console.log("[DEBUG] Browser booted successfully.");
      }).catch(err => {
        browserPromise = null;
        throw err;
      });
    }
    
    if (browserPromise) {
      console.log("[DEBUG] Waiting for browser to finish booting...");
      await browserPromise;
    }
  }

  let page;
  try {
    page = await browserInstance.newPage();
    
    // ==========================================
    // THE MANUAL STEALTH BYPASS (No plugins required)
    // ==========================================
    await page.evaluateOnNewDocument(() => {
      // 1. Hide the WebDriver flag (Akamai's #1 check)
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      
      // 2. Mock the Chrome object
      window.chrome = { runtime: {} };
      
      // 3. Mock plugins to look like a real browser
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log(`[DEBUG] Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    
    console.log("[DEBUG] Waiting 2s for scoreboards...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    let text = await page.evaluate(() => document.body.innerText);
    text = text.replace(/\s+/g, " ").trim();
    
    console.log(`[DEBUG] Success! Grabbed ${text.length} characters.`);
    console.log(text)
    return text.slice(0, 20000);
    
  } catch (err) {
    console.error("\n[SCRAPE ERROR]", err.message);
    return "";
  } finally {
    if (page) await page.close().catch(() => {});
    
    // Critical for Vercel: Kill the browser completely to free RAM
    if (!isLocal && browserInstance) {
      console.log("[DEBUG] Closing browser to flush Vercel memory...");
      await browserInstance.close().catch(() => {});
      browserInstance = null; 
    }
  }
}

module.exports = scrape;