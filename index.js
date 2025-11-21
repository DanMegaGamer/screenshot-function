const functions = require('@google-cloud/functions-framework');
const puppeteer = require('puppeteer');

functions.http('screenshot', (req, res) => {
  // Only handle POST
  if (req.method == "POST") {
    const captureId = crypto.randomUUID()
    const url = req.body.url
    const fullPage = req.body.fullPage || false

    res.send({captureId: captureId, url: url});


    (async () => {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url);
      await page.screenshot({path: `${captureId}.png`, fullPage: fullPage});
      await browser.close();
    })();

  }
});
