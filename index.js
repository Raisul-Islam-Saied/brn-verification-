const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;

// ইউজারের ফর্মের ডেটা পড়ার জন্য
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ১. হোমপেজ (যেখানে ফর্ম দেখাবে)
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
            <div id="loading">সরকারি সার্ভার থেকে ক্যাপচা আনা হচ্ছে... একটু অপেক্ষা করুন ⏳</div>
            
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
            // পেজ লোড হলেই API থেকে ক্যাপচা আনবে
            fetch('/api/get-captcha')
            .then(response => response.json())
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
                    document.getElementById('loading').innerHTML = '<span style="color:red;">ক্যাপচা লোড করতে সমস্যা হয়েছে। পেজটি রিলোড দিন।</span>';
                }
            })
            .catch(err => {
                document.getElementById('loading').innerHTML = '<span style="color:red;">সার্ভার এরর! পেজ রিলোড দিন।</span>';
            });
        </script>
    </body>
    </html>
    `);
});

// ২. ক্যাপচা এবং টোকেন আনার API
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
        
        await page.goto('https://everify.bdris.gov.bd/', { waitUntil: 'networkidle2', timeout: 60000 });
        
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
        res.json({ status: 'error', message: error.message });
    } finally {
        if (browser) await browser.close();
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

        // সরকারি সার্ভারে ডেটা পাঠানো
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

        // HTML থেকে নির্দিষ্ট তথ্যগুলো নিখুঁতভাবে বের করার ফাংশন
        const extract = (keyword) => {
            const regex = new RegExp(`${keyword}[^<]*<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, 'i');
            const m = html.match(regex);
            return m && m[1] ? m[1].replace(/<[^>]*>/g, '').trim() : '';
        };

        // সব তথ্য একসাথে একটি অবজেক্টে সেভ করা
        const details = {
            name: extract('Registered Person Name') || extract('নিবন্ধিত ব্যক্তির নাম'),
            dob: extract('Date of Birth') || extract('জন্ম তারিখ'),
            father: extract("Father's Name") || extract('পিতার নাম'),
            mother: extract("Mother's Name") || extract('মাতার নাম'),
            gender: extract('Sex') || extract('লিঙ্গ'),
            birthPlace: extract('Place of Birth') || extract('জন্মস্থান')
        };
        
        if (details.name) {
            res.send(`
                <div style="font-family: sans-serif; text-align: center; margin-top: 50px; max-width: 600px; margin-left: auto; margin-right: auto;">
                    <h2 style="color: #006a4e;">✅ জন্মনিবন্ধন যাচাই সফল!</h2>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                        <tr>
                            <th style="padding: 12px; border: 1px solid #ddd; background-color: #006a4e; color: white; width: 35%;">তথ্য</th>
                            <th style="padding: 12px; border: 1px solid #ddd; background-color: #006a4e; color: white;">বিস্তারিত</th>
                        </tr>
                        <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><b>শিক্ষার্থীর নাম</b></td><td style="padding: 10px; border: 1px solid #ddd;"><b>${details.name}</b></td></tr>
                        <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><b>জন্মতারিখ</b></td><td style="padding: 10px; border: 1px solid #ddd;">${details.dob}</td></tr>
                        <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><b>পিতার নাম</b></td><td style="padding: 10px; border: 1px solid #ddd;">${details.father}</td></tr>
                        <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><b>মাতার নাম</b></td><td style="padding: 10px; border: 1px solid #ddd;">${details.mother}</td></tr>
                        <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><b>লিঙ্গ</b></td><td style="padding: 10px; border: 1px solid #ddd;">${details.gender}</td></tr>
                        <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><b>জন্মস্থান</b></td><td style="padding: 10px; border: 1px solid #ddd;">${details.birthPlace}</td></tr>
                    </table>
                    
                    <br><br>
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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
