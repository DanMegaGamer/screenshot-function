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
    const viewportHeight = req.body.viewportHeight || 1080

    res.send({captureId: captureId, url: url});

    (async () => {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url);
      await page.setViewport({width: viewportWidth, height: viewportHeight});
      await page.screenshot({path: `${captureId}.png`, fullPage: fullPage});
      await browser.close();
    })();

  }
});
