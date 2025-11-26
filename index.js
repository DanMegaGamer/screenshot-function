const functions = require('@google-cloud/functions-framework');
const puppeteer = require('puppeteer');

// https://docs.cloud.google.com/run/docs/local-dev-functions#node.js_1
// https://github.com/GoogleCloudPlatform/functions-framework?tab=readme-ov-file
// github.com/puppeteer/puppeteer/blob/main/examples/

functions.http('screenshot', (req, res) => {
  // Only handle POST
  if (req.method == "POST") {
    const captureId = crypto.randomUUID()
    const url = req.body.url
    const fullPage = req.body.fullPage ||= false
    const viewportWidth = req.body.viewportWidth ||= 1920
    const viewportHeight = req.body.viewportHeight ||= 1080
    const delay = req.body.delay ||= 0
    const waitForNetworkIdle = req.body.waitForNetworkIdle ||= true
    const waitUntil = req.body.waitUntil ||= 'load'
    const scrollToBottom = req.body.scrollToBottom || true

    res.send({captureId: captureId, url: url});

    (async () => {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: waitUntil });
      await new Promise(r => setTimeout(r, delay));
      await page.setViewport({width: viewportWidth, height: viewportHeight});

      if (scrollToBottom == true) {
        console.log("Scrolling to bottom");
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

      console.log("Scrolling to top");
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
      }

      if (waitForNetworkIdle == true) {
        await page.waitForNetworkIdle();
      }

      await page.screenshot({path: `${captureId}.png`, fullPage: fullPage});
      await browser.close();
    })();

  }
});
