const express = require('express');
const app = express();

// Nutze PORT aus der Umgebung, falls vorhanden (Replit / PaaS benötigen das)
const PORT = process.env.PORT || 3000;

// Health-Endpoint für UptimeRobot
app.get('/health', (req, res) => {
    // Kleiner, schneller Check — bei Bedarf hier weitere Prüfungen hinzufügen
    res.status(200).send('OK');
});

// Einfacher Root-Endpoint
app.get('/', (req, res) => {
    res.send('✅ Bot ist online!');
});

app.listen(PORT, () => {
    console.log(`🌐 Keep-alive server läuft auf Port ${PORT}`);
});

// Starte den Bot
require('./bot.js');
