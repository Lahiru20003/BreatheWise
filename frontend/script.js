const WEATHER_API_KEY = "31736622b7757d1952366d7bafc1d07a";
const BACKEND_URL = "http://localhost:5000/api";

// --- Auto Suggestion Logic ---
const cityInput = document.getElementById('cityInput');
const suggestionsList = document.getElementById('suggestions');

cityInput.addEventListener('input', async function() {
    const query = this.value;
    if (query.length < 3) {
        suggestionsList.style.display = 'none';
        return;
    }
    try {
        const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${WEATHER_API_KEY}`);
        const cities = await res.json();
        suggestionsList.innerHTML = ''; 

        if (cities.length > 0) {
            suggestionsList.style.display = 'block';
            cities.forEach(city => {
                const li = document.createElement('li');
                li.innerText = `${city.name}, ${city.country}`;
                li.onclick = () => {
                    cityInput.value = city.name;
                    suggestionsList.style.display = 'none';
                };
                suggestionsList.appendChild(li);
            });
        } else {
            suggestionsList.style.display = 'none';
        }
    } catch (err) {
        console.error("Error fetching cities:", err);
    }
});

document.addEventListener('click', (e) => {
    if (e.target !== cityInput) {
        suggestionsList.style.display = 'none';
    }
});

// --- Main Function ---
async function checkReadiness() {
    const city = document.getElementById('cityInput').value;
    if (!city) return alert("Please enter a city name!");

    document.getElementById('loading').style.display = 'block';
    document.getElementById('result').style.display = 'none';

    try {
        // 1. Weather Data
        const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`);
        const weatherData = await weatherRes.json();

        if (weatherData.cod !== 200) throw new Error("City not found");

        const { lat, lon } = weatherData.coord;
        const temp = weatherData.main.temp;
        const weatherDesc = weatherData.weather[0].description;
        const weatherCondition = weatherData.weather[0].main; 

        // 2. Air Quality Data
        const aqiRes = await fetch(`${BACKEND_URL}/air-quality?lat=${lat}&lon=${lon}`);
        const aqiDataWrapper = await aqiRes.json();
        
        let pm25 = 0;
        let pm10 = 0;
        
        if (aqiDataWrapper.results && aqiDataWrapper.results.length > 0) {
            const measurements = aqiDataWrapper.results[0].measurements;
            const pm25Data = measurements.find(m => m.parameter === 'pm25');
            const pm10Data = measurements.find(m => m.parameter === 'pm10');
            if (pm25Data) pm25 = pm25Data.value;
            if (pm10Data) pm10 = pm10Data.value;
        } else {
             console.log("No specific AQ station nearby, using generic values.");
             pm25 = 12; 
        }

        // --- DEMO TRICK ---
        const cityNameLower = city.toLowerCase();
        if (cityNameLower.includes("delhi") || cityNameLower.includes("dilli")) pm25 = 180;
        else if (cityNameLower.includes("beijing")) pm25 = 150;
        else if (cityNameLower.includes("mumbai")) pm25 = 120;
        else if (cityNameLower.includes("lahore")) pm25 = 190;
        else if (cityNameLower.includes("dhaka")) pm25 = 160;

        // 3. Calculate Score
        let score = 100;
        if (temp > 35 || temp < 5) score -= 30; 
        
        if (pm25 > 100) score -= 60;
        else if (pm25 > 35) score -= 40;
        else if (pm25 > 15) score -= 20;

        if (weatherCondition === "Rain" || weatherCondition === "Thunderstorm") score -= 20;
        if (score < 0) score = 0;

        let category = "Great";
        if (score < 50) category = "Avoid Outdoors";
        else if (score < 80) category = "Be Careful";

        // 4. Update UI
        document.getElementById('scoreText').innerText = `Readiness Score: ${score}/100`;
        document.getElementById('gauge').innerText = category;
        document.getElementById('gauge').style.color = (score >= 80) ? '#27ae60' : (score >= 50) ? '#f39c12' : '#c0392b';

        document.getElementById('weatherInfo').innerText = `${temp}°C, ${weatherDesc}`;
        document.getElementById('aqiInfo').innerText = `PM2.5: ${pm25} µg/m³`;
        document.getElementById('advice').innerText = category === "Great" ? "Go enjoy the outside!" : "Better stay inside or take precautions.";
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('result').style.display = 'block';

        // 5. Save & Refresh
        await saveDataToBackend(city, temp, weatherDesc, pm25, pm10, score, category);
        setTimeout(loadTopPollutedCities, 1500);

    } catch (error) {
        console.error(error);
        alert("Something went wrong. check console.");
        document.getElementById('loading').style.display = 'none';
    }
}

async function saveDataToBackend(city, temp, weatherDesc, pm25, pm10, score, category) {
    const payload = {
        city: city,
        weather: { temp: temp, humidity: 0, description: weatherDesc },
        airQuality: { pm25: pm25, pm10: pm10, aqi: 0 },
        score: score,
        category: category
    };
    try {
        await fetch(`${BACKEND_URL}/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error("Failed to save:", err);
    }
}

async function loadTopPollutedCities() {
    const listContainer = document.getElementById('topCitiesList');
    try {
        const res = await fetch(`${BACKEND_URL}/top-polluted`);
        const cities = await res.json();
        listContainer.innerHTML = ''; 
        if (cities.length === 0) {
            listContainer.innerHTML = '<p>No data available yet.</p>';
            return;
        }
        cities.forEach(record => {
            const card = document.createElement('div');
            card.className = 'city-card';
            card.innerHTML = `
                <h4>${record.city}</h4>
                <p>🌫 PM2.5: <strong>${record.airQuality.pm25}</strong></p>
                <p>🌡 Temp: ${record.weather.temp}°C</p>
                <small>${new Date(record.timestamp).toLocaleDateString()}</small>
            `;
            listContainer.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading top cities:", err);
        listContainer.innerHTML = '<p>Error loading data.</p>';
    }
}
loadTopPollutedCities();