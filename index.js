const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let globalBrowser = null;

// ব্রাউজার রেডি রাখার ফাংশন
async function initBrowser() {
    try {
        if (globalBrowser) await globalBrowser.close().catch(() => {});
        console.log("--> [INIT] স্মার্ট রোবট ব্রাউজার রেডি হচ্ছে...");
        globalBrowser = await puppeteer.launch({ 
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'] 
        });
        console.log("--> [SUCCESS] রোবট রেডি!");
    } catch (error) {
        console.error("--> [ERROR] রোবট রেডি হতে ব্যর্থ:", error);
    }
}

// ১. আপনার ফ্রন্টএন্ড ফর্ম
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>মাদ্রাসার ভর্তি - জন্মনিবন্ধন যাচাই</title>
        <style>
            body { font-family: sans-serif; padding: 20px; background-color: #f4f7f6; }
            .form-container { background: white; border: 1px solid #ccc; padding: 30px; max-width: 450px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); margin: auto; }
            input[type="text"], input[type="date"] { width: 100%; padding: 10px; margin-top: 5px; margin-bottom: 20px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
            button { background-color: #006a4e; color: white; padding: 12px 15px; border: none; cursor: pointer; width: 100%; border-radius: 4px; font-size: 16px; font-weight: bold; }
            button:hover { background-color: #005a42; }
            #result { margin-top: 20px; text-align: center; font-weight: bold; font-size: 18px; padding: 10px; }
        </style>
    </head>
    <body>
        <div class="form-container">
            <h2 style="text-align: center; color: #006a4e;">শিক্ষার্থীর জন্মনিবন্ধন যাচাই</h2>
            
            <form id="verifyForm">
                <label><b>জন্মনিবন্ধন নম্বর (১৭ ডিজিট):</b></label>
                <input type="text" id="brn" required pattern="[0-9]{17}" placeholder="১৭ ডিজিটের নম্বর দিন">
                
                <label><b>জন্মতারিখ (YYYY-MM-DD):</b></label>
                <input type="date" id="dob" required>
                
                <button type="submit" id="submitBtn">যাচাই করুন</button>
            </form>
            
            <div id="result"></div>
        </div>

        <script>
            document.getElementById('verifyForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('submitBtn');
                const resultDiv = document.getElementById('result');
                
                btn.innerText = "যাচাই হচ্ছে... দয়া করে অপেক্ষা করুন ⏳";
                btn.disabled = true;
                resultDiv.innerHTML = "";

                try {
                    const response = await fetch('/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            brn: document.getElementById('brn').value,
                            dob: document.getElementById('dob').value
                        })
                    });
                    
                    const data = await response.json();
                    
                    if(data.status === 'success') {
                        resultDiv.innerHTML = '<div style="background: #e6f4ea; border: 1px solid #28a745; border-radius: 5px; padding: 10px;"><span style="color: #28a745;">✅ জন্মনিবন্ধনটি সঠিক! (ভর্তির জন্য উপযুক্ত)</span></div>';
                    } else if(data.status === 'invalid') {
                        resultDiv.innerHTML = '<div style="background: #fce4e4; border: 1px solid #dc3545; border-radius: 5px; padding: 10px;"><span style="color: #dc3545;">❌ জন্মনিবন্ধনটি ভুল বা তথ্য পাওয়া যায়নি!</span></div>';
                    } else {
                        resultDiv.innerHTML = '<span style="color: red;">⚠️ সার্ভার এরর: ' + data.message + '</span>';
                    }
                } catch(err) {
                    resultDiv.innerHTML = '<span style="color: red;">নেটওয়ার্ক সমস্যা! আবার চেষ্টা করুন।</span>';
                }
                
                btn.innerText = "যাচাই করুন";
                btn.disabled = false;
            });
        </script>
    </body>
    </html>
    `);
});

// ২. অটোমেটেড রোবট রুট (Puppeteer নিজে সব করবে)
app.post('/verify', async (req, res) => {
    const { brn, dob } = req.body;
    let page;

    try {
        if (!globalBrowser || !globalBrowser.isConnected()) await initBrowser();
        page = await globalBrowser.newPage();
        
        // ওয়েবসাইটে প্রবেশ
        await page.goto('https://jonmonibondhon.org/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        // ম্যাজিক স্ক্রিপ্ট: পেজের ভেতরে গিয়ে নিজে নিজে ফর্ম পূরণ করবে
        await page.evaluate((b, d) => {
            // ইনপুট ফিল্ড খোঁজা
            const inputs = Array.from(document.querySelectorAll('input')).filter(el => {
                const t = el.type.toLowerCase();
                return t === 'text' || t === 'number' || t === 'tel' || t === 'date' || t === '';
            });
            
            // ডেটা বসানো
            if(inputs.length >= 2) {
                inputs[0].value = b;
                inputs[1].value = d;
                inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
                inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
                inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            // সাবমিট বাটনে ক্লিক করা
            const btn = document.querySelector('button[type="submit"], input[type="submit"], button');
            if(btn) {
                btn.click();
            } else {
                const form = document.querySelector('form');
                if(form) form.submit();
            }
        }, brn, dob);

        // রেজাল্ট আসার জন্য ৫ সেকেন্ড অপেক্ষা করা
        await new Promise(r => setTimeout(r, 5000));

        // পেজের সম্পূর্ণ লেখা চেক করা
        const pageText = await page.evaluate(() => document.body.innerText);

        // স্ট্রিক্ট লজিক: ভুল ধরার জন্য (যদি এই শব্দগুলো থাকে, তবে শিওর ভুল)
        const isError = pageText.includes('Not Found') || 
                        pageText.toLowerCase().includes('no data') || 
                        pageText.includes('পাওয়া যায়নি') || 
                        pageText.includes('ভুল') || 
                        pageText.includes('Invalid') || 
                        pageText.toLowerCase().includes('not match') ||
                        pageText.includes('Does not exist');

        // স্ট্রিক্ট লজিক: সঠিক ধরার জন্য (মাতা/পিতার নাম বা 'নিবন্ধিত ব্যক্তি' আসলেই শুধু সঠিক বলবে)
        const isSuccess = pageText.includes('মাতার নাম') || 
                          pageText.includes('পিতার নাম') || 
                          pageText.includes("Mother's Name") || 
                          pageText.includes("Father's Name") || 
                          pageText.includes('Registered Person') ||
                          pageText.includes('নিবন্ধিত ব্যক্তি') ||
                          pageText.includes('Date of Registration');

        if (isError) {
            res.json({ status: "invalid" });
        } else if (isSuccess) {
            res.json({ status: "success" });
        } else {
            // কনফিউশন থাকলে সেফটির জন্য ভুল হিসেবেই ধরবে (False Positive বন্ধ করতে)
            res.json({ status: "invalid" });
        }

    } catch (error) {
        console.error("❌ [VERIFY ERROR]:", error.message);
        res.json({ status: 'error', message: error.message });
    } finally {
        if (page) await page.close();
    }
});

app.listen(port, async () => {
    console.log(`🚀 === [SERVER LIVE] সার্ভার চালু হয়েছে। পোর্ট: ${port} ===`);
    await initBrowser(); 
});
