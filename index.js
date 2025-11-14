const express = require('express');
const app = express();

// Einfacher HTTP-Server um Replit wach zu halten
app.get('/', (req, res) => {
    res.send('✅ Bot ist online!');
});

app.listen(3000, () => {
    console.log('🌐 Keep-alive server läuft auf Port 3000');
});

// Starte den Bot
require('./bot.js');
