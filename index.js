const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log("--> [STARTUP] ক্যাপচামুক্ত ফাস্ট API সার্ভার চালু হচ্ছে...");

// ১. ফ্রন্টএন্ড ফর্ম
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
            #result { margin-top: 20px; text-align: center; font-weight: bold; font-size: 18px; }
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
                
                btn.innerText = "যাচাই হচ্ছে... ⏳";
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
                        resultDiv.innerHTML = '<span style="color: green;">✅ জন্মনিবন্ধনটি সঠিক! (মাদ্রাসায় ভর্তির জন্য উপযুক্ত)</span>';
                    } else if(data.status === 'invalid') {
                        resultDiv.innerHTML = '<span style="color: red;">❌ জন্মনিবন্ধনটি ভুল বা তথ্য পাওয়া যায়নি!</span>';
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

// ২. সুপার ফাস্ট Fetch API (Puppeteer ছাড়া)
app.post('/verify', async (req, res) => {
    const { brn, dob } = req.body;

    try {
        // jonmonibondhon.org এর সার্ভারে ডেটা পাঠানো হচ্ছে
        const fetchParams = new URLSearchParams();
        
        // -------------------------------------------------------------
        // সাঈদ ভাই, এখানে একটি ছোট কাজ আছে। jonmonibondhon.org এর ফর্মে 
        // ইনপুট ফিল্ডের "name" অ্যাট্রিবিউট যা আছে, তা এখানে বসাতে হবে। 
        // আমি অনুমান করে 'brn' এবং 'dob' লিখলাম।
        // -------------------------------------------------------------
        fetchParams.append('brn', brn); 
        fetchParams.append('dob', dob); 

        const response = await fetch('https://jonmonibondhon.org/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: fetchParams
        });

        const html = await response.text();

        // রেজাল্ট পেজে নিচের শব্দগুলো থাকলে আমরা ধরে নেব তথ্য সঠিক
        if (html.includes('সঠিক') || html.includes('Found') || html.includes('সফল') || html.includes(brn)) {
            res.json({ status: "success" });
        } else {
            res.json({ status: "invalid" });
        }

    } catch (error) {
        console.error("❌ [VERIFY ERROR]:", error.message);
        res.json({ status: 'error', message: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 === [SERVER LIVE] ফাস্ট সার্ভার চালু হয়েছে। পোর্ট: ${port} ===`);
});
