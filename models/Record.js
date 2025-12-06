const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
    city: { type: String, required: true },
    weather: {
        temp: Number,
        humidity: Number,
        description: String
    },
    airQuality: {
        pm25: Number,
        pm10: Number,
        aqi: Number
    },
    score: Number,
    category: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Record', RecordSchema);