const functions = require('@google-cloud/functions-framework');
const puppeteer = require('puppeteer');
const { PuppeteerBlocker } = require('@ghostery/adblocker-puppeteer');
const path = require('path');
const autoConsentPath = path.join(__dirname, 'node_modules/@duckduckgo/autoconsent/dist/addon-mv3/')

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
    const waitUntil = req.body.waitUntil ||= 'load'
    const triggerLazyLoad = req.body.triggerLazyLoad ||= true
    const clickAccept = req.body.clickAccept ||= false
    const blockAds = req.body.blockAds ||= false
    let proxyUrl;

    // Scrolling defaults
    const scrollInterval = 500 // delay between viewport mouse scrolls

    if (req.body.proxy) {
      console.log("Proxy provided")
      // TODO: Handle Uncaught TypeError: Invalid URL
      proxyUrl = new URL(`https://${req.body.proxy}`);
    }

    const extensionPaths = [
      ...(clickAccept == true ? [autoConsentPath]: [])
    ]

    res.send({captureId: captureId, url: url});

    (async () => {
      const browser = await puppeteer.launch(
        {
          args: [
            `--disable-extensions-except=${extensionPaths}`,
            `--load-extension=${extensionPaths}`,
            ...(proxyUrl ? [`--proxy-server=${proxyUrl.host}`] : [])
          ]
        }
      );

      const page = await browser.newPage();

      if (blockAds == true) {
        console.log("Enabling adblock")
        PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
          blocker.enableBlockingInPage(page);
        });
      }

      if (proxyUrl) {
        console.log("Authenticating proxy")

        await page.authenticate({
          username: proxyUrl.username,
          password: proxyUrl.password
        })
      }

      await page.goto(url, { waitUntil: waitUntil });
      await new Promise(r => setTimeout(r, delay));
      await page.setViewport({width: viewportWidth, height: viewportHeight});


      // This is probably only required if fullPage == true
      // We scroll in vertical chunks of viewportHeight with a delay
      // stopping when reaching documentHeight
      if (triggerLazyLoad == true) {
        console.log("Detecting initial document height");
        let documentHeight = await page.evaluate(() => { return document.body.scrollHeight });
        console.log("documentHeight", documentHeight);

        let currentPosition = 0;

        while (currentPosition < documentHeight) {
          console.log("currentPosition", currentPosition)
          await page.mouse.wheel({ deltaY: currentPosition});

          let scrollY = await page.evaluate(() => window.scrollY);
          currentPosition += scrollY + viewportHeight;
          await new Promise(resolve => setTimeout(resolve, scrollInterval));
        }

        console.log("Waiting for lazy loads")

        try {
          await page.waitForNetworkIdle();
        } catch(error) {
          console.log("Exceeded the timeout with", error)
        }
      }

      await page.evaluate(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "instant",
        });
      });

      console.log("Capturing screenshot");
      await page.screenshot({path: `${captureId}.png`, fullPage: fullPage});

      console.log("Screenshot captured");
      await browser.close();
    })();
  }
});
