const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Erstelle einen neuen Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Event: Bot ist bereit
client.once('ready', () => {
    console.log(`✅ Bot ist online als ${client.user.tag}`);
    console.log(`🤖 Bot ID: ${client.user.id}`);
    console.log(`📊 In ${client.guilds.cache.size} Server(n)`);
    
    // Setze den Bot-Status
    client.user.setActivity('Warte auf Befehle...', { type: 'WATCHING' });
});

// Event: Fehlerbehandlung
client.on('error', error => {
    console.error('❌ Discord Client Error:', error);
});

// Event: Warnung
client.on('warn', info => {
    console.warn('⚠️ Discord Client Warning:', info);
});

// Event: Neue Nachricht (Beispiel für zukünftige Erweiterungen)
client.on('messageCreate', message => {
    // Ignoriere Bot-Nachrichten
    if (message.author.bot) return;
    
    // Hier können später Befehle hinzugefügt werden
    // Beispiel:
    // if (message.content === '!ping') {
    //     message.reply('Pong! 🏓');
    // }
});

// Login mit dem Bot Token
client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('🔐 Bot-Login erfolgreich');
    })
    .catch(error => {
        console.error('❌ Fehler beim Login:', error);
        process.exit(1);
    });

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('\n⏹️ Bot wird heruntergefahren...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n⏹️ Bot wird heruntergefahren...');
    client.destroy();
    process.exit(0);
});
