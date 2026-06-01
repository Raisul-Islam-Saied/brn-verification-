const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// গ্লোবাল ভেরিয়েবল (ব্রাউজার একবারই ওপেন হয়ে এখানে সেভ থাকবে)
let globalBrowser = null;

// সার্ভার চালু হওয়ার সাথে সাথেই ব্রাউজার লঞ্চ করে রেডি রাখার ফাংশন
async function initBrowser() {
    try {
        console.log("--> [INIT] ব্যাকগ্রাউন্ডে ব্রাউজার রেডি করা হচ্ছে...");
        globalBrowser = await puppeteer.launch({ 
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage', 
                '--disable-gpu',
                '--no-zygote', 
                '--single-process'
            ] 
        });
        console.log("--> [SUCCESS] ব্রাউজার ব্যাকগ্রাউন্ডে রেডি! এখন রিকোয়েস্ট ফাস্ট হবে।");
    } catch (error) {
        console.error("--> [ERROR] ব্রাউজার রেডি হতে ব্যর্থ:", error);
    }
}

// ১. হোমপেজ রুট
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ভর্তি সিস্টেম - জন্মনিবন্ধন যাচাই</title>
        <style>
            body { font-family: sans-serif; padding: 20px; background-color: #f4f7f6; }
            .form-container { background: white; border: 1px solid #ccc; padding: 30px; max-width: 450px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); margin: auto; }
            input[type="text"], input[type="date"] { width: 100%; padding: 10px; margin-top: 5px; margin-bottom: 20px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
            button { background-color: #006a4e; color: white; padding: 12px 15px; border: none; cursor: pointer; width: 100%; border-radius: 4px; font-size: 16px; font-weight: bold; }
            button:hover { background-color: #005a42; }
            h2 { text-align: center; color: #006a4e; }
            #loading { text-align: center; color: #d97706; font-weight: bold; margin-bottom: 15px; }
        </style>
    </head>
    <body>
        <div class="form-container">
            <h2>শিক্ষার্থীর জন্মনিবন্ধন যাচাই</h2>
            <div id="loading">সরকারি সার্ভার থেকে তথ্য আনা হচ্ছে, কয়েক সেকেন্ড অপেক্ষা করুন ⏳</div>
            
            <form id="verifyForm" action="/verify" method="POST" style="display:none;">
                <label><b>জন্মনিবন্ধন নম্বর (১৭ ডিজিট):</b></label>
                <input type="text" name="brn" required pattern="[0-9]{17}" placeholder="১৭ ডিজিটের নম্বর দিন">
                
                <label><b>জন্মতারিখ (YYYY-MM-DD):</b></label>
                <input type="date" name="dob" required>
                
                <input type="hidden" name="csrf" id="csrf">
                <input type="hidden" name="cap_text" id="cap_text">
                <input type="hidden" name="cookie_data" id="cookie_data">
                
                <label><b>ক্যাপচায় কী লেখা আছে লিখুন:</b></label><br>
                <div style="text-align: center;">
                    <img id="captcha_img" src="" alt="Captcha" style="border:1px solid #000; margin: 10px 0; max-width:100%; border-radius: 4px;">
                </div>
                <input type="text" name="captcha_answer" required autocomplete="off" placeholder="ওপরের লেখাটি হুবহু লিখুন">
                
                <button type="submit">যাচাই ও আবেদন করুন</button>
            </form>
        </div>

        <script>
            // টাইমআউট কমিয়ে ৩০ সেকেন্ড করা হলো, কারণ এখন আর দেরি হবে না
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            fetch('/api/get-captcha', { signal: controller.signal })
            .then(response => {
                clearTimeout(timeoutId);
                return response.json();
            })
            .then(data => {
                if(data.status === 'success'){
                    document.getElementById('captcha_img').src = data.captchaBase64;
                    document.getElementById('csrf').value = data.csrfToken;
                    document.getElementById('cap_text').value = data.capText;
                    let cookieStr = data.cookies.map(c => c.name + '=' + c.value).join('; ');
                    document.getElementById('cookie_data').value = btoa(cookieStr);
                    
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('verifyForm').style.display = 'block';
                } else {
                    document.getElementById('loading').innerHTML = '<span style="color:red;">সার্ভার এরর: ' + data.message + '</span>';
                }
            })
            .catch(err => {
                if (err.name === 'AbortError') {
                    document.getElementById('loading').innerHTML = '<span style="color:red;">নেটওয়ার্ক সমস্যা। পেজটি আবার রিলোড দিন।</span>';
                } else {
                    document.getElementById('loading').innerHTML = '<span style="color:red;">ক্যাপচা লোড ব্যর্থ! পেজ রিলোড দিন।</span>';
                }
            });
        </script>
    </body>
    </html>
    `);
});

// ২. সুপার ফাস্ট ক্যাপচা API
app.get('/api/get-captcha', async (req, res) => {
    let page;
    try {
        // যদি ব্রাউজার কোনো কারণে ক্র্যাশ করে থাকে, তবে নতুন করে ওপেন করবে
        if (!globalBrowser) await initBrowser();

        console.log("1. ব্রাউজারে নতুন ট্যাব ওপেন হচ্ছে...");
        // পুরো ব্রাউজার লঞ্চ না করে, শুধু একটি নতুন ট্যাব খোলা হচ্ছে (খুবই দ্রুত)
        page = await globalBrowser.newPage();
        
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // অপ্রয়োজনীয় ফাইল লোড হওয়া বন্ধ করা হচ্ছে স্পিড বাড়ানোর জন্য
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (['stylesheet', 'font', 'media'].includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        console.log("2. সরকারি সাইটে নেভিগেট করা হচ্ছে...");
        await page.goto('https://everify.bdris.gov.bd/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        console.log("3. ক্যাপচা এলিমেন্টের জন্য অপেক্ষা...");
        await page.waitForSelector('#CaptchaImage', { timeout: 15000 });
        
        const csrfToken = await page.$eval('input[name="__RequestVerificationToken"]', el => el.value);
        const capText = await page.$eval('#CaptchaDeText', el => el.value);
        const cookies = await page.cookies();
        
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
        console.error("❌ [API ERROR]:", error.message);
        res.json({ status: 'error', message: error.message });
    } finally {
        // কাজ শেষে পুরো ব্রাউজার ক্লোজ না করে শুধুমাত্র কারেন্ট ট্যাব (Page) ক্লোজ করা হচ্ছে
        if (page) await page.close();
    }
});

// ৩. ডেটা ভেরিফাই করার রুট
app.post('/verify', async (req, res) => {
    const { brn, dob, captcha_answer, csrf, cap_text, cookie_data } = req.body;
    const cookieStr = Buffer.from(cookie_data, 'base64').toString('utf-8');

    try {
        const fetchParams = new URLSearchParams();
        fetchParams.append('__RequestVerificationToken', csrf);
        fetchParams.append('UBRN', brn);
        fetchParams.append('BirthDate', dob);
        fetchParams.append('CaptchaDeText', cap_text);
        fetchParams.append('CaptchaInputText', captcha_answer);

        const response = await fetch('https://everify.bdris.gov.bd/UBRNVerification/Search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': cookieStr,
                'Referer': 'https://everify.bdris.gov.bd/'
            },
            body: fetchParams
        });

        const html = await response.text();

        if (html.includes('Registered Person Name') || html.includes('নিবন্ধিত ব্যক্তির নাম')) {
            const regex = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
            let match;
            let allDataRows = '';
            
            while ((match = regex.exec(html)) !== null) {
                let key = match[1].replace(/<[^>]*>/g, '').trim();
                let value = match[2].replace(/<[^>]*>/g, '').trim();
                if (key && value && key.length < 100) {
                    allDataRows += `<tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><b>${key}</b></td><td style="padding: 10px; border: 1px solid #ddd;"><b>${value}</b></td></tr>`;
                }
            }

            res.send(`
                <div style="font-family: sans-serif; text-align: center; margin-top: 50px; max-width: 700px; margin-left: auto; margin-right: auto;">
                    <h2 style="color: #006a4e;">✅ জন্মনিবন্ধন যাচাই সফল!</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                        <tr>
                            <th style="padding: 12px; border: 1px solid #ddd; background-color: #006a4e; color: white; width: 40%;">সার্ভার থেকে আসা ফিল্ড</th>
                            <th style="padding: 12px; border: 1px solid #ddd; background-color: #006a4e; color: white;">সার্ভার থেকে আসা ডেটা</th>
                        </tr>
                        ${allDataRows}
                    </table>
                    <br>
                    <a href="/" style="padding: 10px 20px; background: #006a4e; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">নতুন যাচাই করুন</a>
                </div>
            `);
        } else {
            res.send(`
                <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                    <h2 style="color: red;">ত্রুটি বা তথ্য মেলেনি! ❌</h2>
                    <p>সম্ভাব্য কারণ: জন্মনিবন্ধন নম্বর ভুল, জন্মতারিখ ভুল অথবা ক্যাপচা ভুল হয়েছে।</p>
                    <br>
                    <a href="/" style="padding: 10px 20px; background: #006a4e; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">আবার চেষ্টা করুন</a>
                </div>
            `);
        }
    } catch (error) {
        res.send("<h3 style='color:red; text-align:center;'>সার্ভার এরর: " + error.message + "</h3>");
    }
});

// সার্ভার স্টার্ট হওয়ার সময় ব্রাউজার ফাংশন কল করা হচ্ছে
app.listen(port, async () => {
    console.log(`🚀 === [SERVER LIVE] সার্ভার চালু হয়েছে। পোর্ট: ${port} ===`);
    await initBrowser(); 
});
