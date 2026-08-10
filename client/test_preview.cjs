const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log("Navigating to live site to set localStorage...");
  await page.goto('https://surveysphere.netlify.app/', { waitUntil: 'networkidle2' });
  
  await page.evaluate(() => {
    localStorage.setItem('surveyPreview', JSON.stringify({
      title: "Test",
      questions: [
        { id: '1', type: 'text', title: 'Question 1' },
        { id: '2', type: 'matrix', title: 'Matrix Test' } // Missing rows and columns on purpose to see if it's the same error
      ],
      theme: { isLight: true, layout: 'centered', backgroundColor: '#fff', fontFamily: 'Inter' },
      landingPage: { showEstimatedTime: false, showQuestionCount: false, buttonText: 'Begin' },
      settings: {}
    }));
  });

  console.log("Navigating to live preview...");
  await page.goto('https://surveysphere.netlify.app/s/preview', { waitUntil: 'networkidle2' });
  
  console.log("Waiting a bit for render...");
  await new Promise(resolve => setTimeout(resolve, 2000));

  await browser.close();
})();
