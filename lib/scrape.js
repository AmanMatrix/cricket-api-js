const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const chromium = require("@sparticuz/chromium");

puppeteer.use(StealthPlugin());

let browserInstance = null;
let browserPromise = null; // Add this lock!

const isLocal = !process.env.VERCEL_ENV && !process.env.AWS_EXECUTION_ENV;

async function scrape(url) {
  console.log(`\n[DEBUG] Scraper initiated for URL: ${url}`);
  
  // CONCURRENCY LOCK: If no browser, and no browser is currently booting
  if (!browserInstance) {
    if (!browserPromise) {
      console.log("[DEBUG] Booting new Stealth Browser...");
      
      let executablePath = isLocal 
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" 
        : await chromium.executablePath();

      // Store the launching process in a promise
      browserPromise = puppeteer.launch({
        args: isLocal ? puppeteer.defaultArgs() : chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: isLocal ? "new" : chromium.headless,
        ignoreHTTPSErrors: true,
      }).then(browser => {
        browserInstance = browser;
        browserPromise = null; // Clear the lock once booted
        console.log("[DEBUG] Browser booted successfully.");
      }).catch(err => {
        browserPromise = null;
        throw err;
      });
    }
    
    // If a browser is currently booting, wait for it to finish
    if (browserPromise) {
      console.log("[DEBUG] Waiting for browser to finish booting...");
      await browserPromise;
    }
  }

  let page;
  try {
    page = await browserInstance.newPage();
    
    // Spoof a hyper-realistic User-Agent and headers to fool Akamai
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // NOTE: I disabled the request interception (blocking images/CSS) for now. 
    // Akamai is smart enough to realize that if a browser doesn't request CSS/images, 
    // it's likely a scraper. We have to eat the slower load time to survive the WAF.

    console.log(`[DEBUG] Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    
    console.log("[DEBUG] Waiting 2s for scoreboards...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    let text = await page.evaluate(() => document.body.innerText);
    text = text.replace(/\s+/g, " ").trim();
    
    console.log(`[DEBUG] Success! Grabbed ${text.length} characters.`);
    return text.slice(0, 6000);
    
  } catch (err) {
    console.error("\n[SCRAPE ERROR]", err.message);
    return "";
  } finally {
    if (page) {
      console.log("[DEBUG] Closing tab...");
      await page.close().catch(() => {});
    }
    // ADD THIS FOR VERCEL: Kill the browser completely to free RAM
    if (browserInstance) {
      console.log("[DEBUG] Closing browser to flush Vercel memory...");
      await browserInstance.close().catch(() => {});
      browserInstance = null; 
      browserPromise = null;
    }
  }
}

module.exports = scrape;