require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PORT = process.env.PORT || 3001;
const SESSIONS_DIR = path.join(__dirname, '../../sessions');
const MENTOR_SECRET_KEY = process.env.MENTOR_SECRET_KEY;

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

module.exports = {
    genAI,
    PORT,
    SESSIONS_DIR,
    MENTOR_SECRET_KEY,
};