require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const Record = require('./models/Record');

const app = express();

app.use(cors());
app.use(express.json());

// 1. Database Connection
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log("✅ MongoDB Connected Successfully!"))
        .catch((err) => console.error("❌ MongoDB Connection Error:", err));
}

// --- ROOT ROUTE ---
app.get('/', (req, res) => {
    res.send("✅ Breathe Wise Backend is Running Successfully!");
});

// --- API ROUTES ---

// 2. Proxy for OpenAQ
app.get('/api/air-quality', async (req, res) => {
    const { lat, lon } = req.query;
    try {
        
        let openAqUrl = `https://api.openaq.org/v2/latest?coordinates=${lat},${lon}&radius=10000&limit=1`;
        if (process.env.OPENAQ_API_KEY) {
            openAqUrl += `&api_key=${process.env.OPENAQ_API_KEY}`;
        }
        
        const response = await axios.get(openAqUrl);
        res.json(response.data);
    } catch (error) {
        console.error("OpenAQ Error:", error.message);
        res.json({ results: [] }); 
    }
});

// 3. Save Record
app.post('/api/records', async (req, res) => {
    try {
        const newRecord = new Record(req.body);
        const savedRecord = await newRecord.save();
        res.status(201).json({ message: "Data Saved Successfully!", data: savedRecord });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Get Top 3 Polluted Cities
app.get('/api/top-polluted', async (req, res) => {
    try {
        const records = await Record.find().sort({ "airQuality.pm25": -1 }).limit(3);
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Server Startup (Vercel Compatible) ---
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

module.exports = app;