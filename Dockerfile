FROM node:18-bullseye-slim

# সার্ভারে ম্যানুয়ালি Chromium এবং তার প্রয়োজনীয় ফাইলগুলো ইন্সটল করা হচ্ছে
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libfreetype6 \
    libharfbuzz0b \
    ca-certificates \
    fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Puppeteer-কে বলে দেওয়া হচ্ছে যে সে যেন নিজে ব্রাউজার ডাউনলোড না করে, বরং আমাদের ইন্সটল করা Chromium ব্যবহার করে
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
