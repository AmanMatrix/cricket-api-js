const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

let browserInstance = null;
let browserPromise = null;

async function scrape(url) {
  console.log(`\n[DEBUG] Scraper initiated for URL: ${url}`);
  
  if (!browserInstance) {
    if (!browserPromise) {
      console.log("[DEBUG] Booting new Serverless Browser...");
      
      browserPromise = puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
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
    // THE MANUAL STEALTH BYPASS
    // ==========================================
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1. Disable internal Puppeteer caching
    await page.setCacheEnabled(false);

    // ==========================================
    // THE URL CACHE-BUSTER
    // ==========================================
    // 2. Append a unique timestamp to force the CDN to serve a fresh page
    const targetUrl = new URL(url);
    targetUrl.searchParams.append("_cb", Date.now());

    console.log(`[DEBUG] Navigating to ${targetUrl.toString()}...`);
    await page.goto(targetUrl.toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
    
    console.log("[DEBUG] Waiting 2s for scoreboards...");
    await new Promise(resolve => setTimeout(resolve, 2000));
   // ==========================================
    // THE DOM PRUNER & SAFE UNHIDE
    // ==========================================
    await page.evaluate(() => {
      // 1. Destroy non-visible code blocks and tracking pixels
      const codeTrash = document.querySelectorAll('script, style, noscript, meta, link, svg, iframe');
      codeTrash.forEach(el => el.remove());

      // 2. Destroy layout clutter (headers, footers, sidebars)
      const layoutTrash = document.querySelectorAll('header, footer, nav, aside');
      layoutTrash.forEach(el => el.remove());

      // 3. Safely unhide ONLY structural content containers
      // This prevents unhiding broken internal framework divs
      const contentElements = document.querySelectorAll('div, span, section, table, tbody, tr, td, ul, li');
      contentElements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') {
          el.style.setProperty('display', 'block', 'important');
          el.style.setProperty('visibility', 'visible', 'important');
        }
      });
    });

    let text = await page.evaluate(() => document.body.innerText);
    text = text.replace(/\s+/g, " ").trim();
    
    console.log(`[DEBUG] Success! Grabbed ${text.length} characters.`);
    console.log(text)
    return text.slice(0, 10000);
    
  } catch (err) {
    console.error("\n[SCRAPE ERROR]", err.message);
    return "";
  } finally {
    if (page) await page.close().catch(() => {});
    
    // Critical for Vercel: Always kill the browser completely to free RAM
    if (browserInstance) {
      console.log("[DEBUG] Closing browser to flush Vercel memory...");
      await browserInstance.close().catch(() => {});
      browserInstance = null; 
    }
  }
}

module.exports = scrape;