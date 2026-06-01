const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;

// JSON ডেটা আদান-প্রদানের জন্য
app.use(express.json());

app.get('/', (req, res) => {
    res.send('<h2>মাদ্রাসার BDRIS API সার্ভার ঠিকমতো রান করছে! 🚀</h2>');
});

// ১. ক্যাপচা এবং টোকেন আনার API
app.get('/api/get-captcha', async (req, res) => {
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
        });
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // সরকারি ওয়েবসাইটে প্রবেশ
        await page.goto('https://everify.bdris.gov.bd/', { waitUntil: 'networkidle2', timeout: 60000 });

        // হিডেন টোকেনগুলো এক্সট্র্যাক্ট করা
        const csrfToken = await page.$eval('input[name="__RequestVerificationToken"]', el => el.value);
        const capText = await page.$eval('#CaptchaDeText', el => el.value);

        // সেশন কুকিগুলো সেভ করা (পরবর্তীতে সাবমিট করার জন্য লাগবে)
        const cookies = await page.cookies();

        // শুধুমাত্র ক্যাপচার ইমেজটির (DOM Element) স্ক্রিনশট নেওয়া
        const captchaElement = await page.$('#CaptchaImage');
        const captchaBase64 = await captchaElement.screenshot({ encoding: 'base64' });

        res.json({
            status: 'success',
            captchaBase64: 'data:image/png;base64,' + captchaBase64,
            csrfToken: csrfToken,
            capText: capText,
            cookies: cookies
        });

    } catch (error) {
        res.json({ status: 'error', message: error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
