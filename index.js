const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let globalBrowser = null;

async function initBrowser() {
    try {
        if (globalBrowser) {
            await globalBrowser.close().catch(() => {});
        }
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
        console.log("--> [SUCCESS] ব্রাউজার ব্যাকগ্রাউন্ডে রেডি!");
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
        if (!globalBrowser || !globalBrowser.isConnected()) {
            await initBrowser();
        }

        page = await globalBrowser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (['stylesheet', 'font', 'media'].includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        await page.goto('https://everify.bdris.gov.bd/', { waitUntil: 'domcontentloaded', timeout: 30000 });
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
                'Referer': 'https://everify.bdris.gov.bd/',
                'Connection': 'close' // <--- এই লাইনটিই সেই fetch failed-এর ম্যাজিক সমাধান!
            },
            body: fetchParams
        });

        const html = await response.text();

        if (html.includes('Registered Person Name') || html.includes('নিবন্ধিত ব্যক্তির নাম')) {
            let processedHtml = html.replace(/<br\s*[\/]?>/gi, ' | ');

            const extract = (keyword) => {
                const regex = new RegExp(`${keyword}[\\s\\S]*?<td[^>]*>([\\s\\S]*?)<\\/td>`, 'i');
                const m = processedHtml.match(regex);
                return m && m[1] ? m[1].replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ') : '';
            };

            const jsonData = {
                status: "success",
                student_info: {
                    brn: brn,
                    dob: dob,
                    name_bn: extract('নিবন্ধিত ব্যক্তির নাম'),
                    name_en: extract('Registered Person Name'),
                    gender: extract('Sex') || extract('লিঙ্গ'),
                    birth_place_bn: extract('জন্মস্থান'),
                    birth_place_en: extract('Place of Birth')
                },
                parents_info: {
                    father_name_bn: extract('পিতার নাম'),
                    father_name_en: extract("Father's Name"),
                    father_nationality: extract('পিতার জাতীয়তা') || extract("Father's Nationality"),
                    mother_name_bn: extract('মাতার নাম'),
                    mother_name_en: extract("Mother's Name"),
                    mother_nationality: extract('মাতার জাতীয়তা') || extract("Mother's Nationality")
                }
            };

            res.send(`
                <div style="font-family: sans-serif; text-align: center; margin-top: 30px; max-width: 800px; margin-left: auto; margin-right: auto;">
                    <h2 style="color: #006a4e;">✅ জন্মনিবন্ধন যাচাই সফল!</h2>
                    <p style="color: #555;">মাদ্রাসার ডাটাবেসে সেভ করার জন্য নিচে গোছানো JSON ডেটা দেওয়া হলো:</p>
                    
                    <div style="text-align: left; background: #282c34; color: #61dafb; padding: 25px; border-radius: 8px; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                        <button onclick="navigator.clipboard.writeText(document.getElementById('json-data').innerText); alert('✅ JSON কপি হয়েছে!');" style="position: absolute; top: 15px; right: 15px; background: #006a4e; color: white; padding: 8px 15px; border: none; cursor: pointer; border-radius: 4px; font-weight: bold; font-size: 14px;">কপি করুন</button>
                        <pre id="json-data" style="margin: 0; font-size: 15px; overflow-x: auto; font-family: monospace;">${JSON.stringify(jsonData, null, 4)}</pre>
                    </div>
                    
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

app.listen(port, async () => {
    console.log(`🚀 === [SERVER LIVE] সার্ভার চালু হয়েছে। পোর্ট: ${port} ===`);
    await initBrowser(); 
});
