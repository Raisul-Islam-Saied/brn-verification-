const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;

// হোমপেজের রুট (Cannot GET / এরর দূর করার জন্য)
app.get('/', (req, res) => {
    res.send(`
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
            <h2>মাদ্রাসার সার্ভার ঠিকমতো রান করছে! 🚀</h2>
            <a href="/get-screenshot" style="padding: 10px 20px; background: #006a4e; color: white; text-decoration: none; border-radius: 5px;">স্ক্রিনশট দেখতে এখানে ক্লিক করুন</a>
        </div>
    `);
});

// স্ক্রিনশট নেওয়ার রুট
app.get('/get-screenshot', async (req, res) => {
    let browser;
    try {
        // হেডলেস ক্রোম ব্রাউজার চালু করা (পাথ ঠিক করে দেওয়া হয়েছে)
        browser = await puppeteer.launch({ 
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
        });
        const page = await browser.newPage();
        
        // আসল ব্রাউজার সাজার জন্য User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // পেজ লোড হওয়ার জন্য পর্যাপ্ত সময় দেওয়া
        await page.goto('https://everify.bdris.gov.bd/', { waitUntil: 'networkidle2', timeout: 60000 });

        // স্ক্রিনশট নেওয়া
        const screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });
        
        res.send(`
            <div style="text-align: center; font-family: sans-serif;">
                <h3>সার্ভার থেকে নেওয়া লাইভ স্ক্রিনশট:</h3>
                <img src="data:image/png;base64,${screenshot}" style="border: 2px solid red; max-width: 100%; box-shadow: 0 4px 8px rgba(0,0,0,0.2);" />
            </div>
        `);
    } catch (error) {
        res.send("<h3 style='color:red;'>Error:</h3> <p>" + error.message + "</p>");
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
