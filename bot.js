const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

// Erstelle einen neuen Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ]
});

// Speicher für aktive Fights (messageId -> fight data)
const activeFights = new Map();

// Channel IDs
const FIGHT_CHANNEL_ID = '1438245823707353171';
const CAMPER_CHANNEL_ID = '1438896012155420682';

// Definiere Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName('fight')
        .setDescription('Erstelle einen neuen Fight')
        .addIntegerOption(option =>
            option.setName('slots')
                .setDescription('Anzahl der verfügbaren Slots')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(22)),
    new SlashCommandBuilder()
        .setName('add')
        .setDescription('Füge einen User zum Fight hinzu')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Der User, der hinzugefügt werden soll')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Entferne einen User aus dem Fight')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Der User, der entfernt werden soll')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('camper')
        .setDescription('Starte einen Camper-Timer')
        .addIntegerOption(option =>
            option.setName('minuten')
                .setDescription('Zeit in Minuten')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1440)),
].map(command => command.toJSON());

// Event: Bot ist bereit
client.once('ready', async () => {
    console.log(`✅ Bot ist online als ${client.user.tag}`);
    console.log(`🤖 Bot ID: ${client.user.id}`);
    console.log(`📊 In ${client.guilds.cache.size} Server(n)`);
    
    // Setze den Bot-Status
    client.user.setActivity('/fight zum Starten', { type: 'WATCHING' });
    
    // Registriere Slash Commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log('🔄 Registriere Slash Commands...');
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        
        console.log('✅ Slash Commands erfolgreich registriert!');
    } catch (error) {
        console.error('❌ Fehler beim Registrieren der Slash Commands:', error);
    }
});

// Event: Fehlerbehandlung
client.on('error', error => {
    console.error('❌ Discord Client Error:', error);
});

// Event: Warnung
client.on('warn', info => {
    console.warn('⚠️ Discord Client Warning:', info);
});

// Event: Slash Command Interaktion
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    
    if (commandName === 'fight') {
        // Prüfe ob der Command im richtigen Channel ist
        if (interaction.channelId !== FIGHT_CHANNEL_ID) {
            return await interaction.reply({
                content: `❌ Dieser Command kann nur in <#${FIGHT_CHANNEL_ID}> verwendet werden!`,
                ephemeral: true
            });
        }
        
        const slots = interaction.options.getInteger('slots');
        
        // Erstelle Fight-Daten
        const fightData = {
            creator: interaction.user.id,
            slots: slots,
            participants: [],
            channelId: interaction.channelId
        };
        
        // Erstelle Embed
        const embed = {
            color: 0xff0000,
            title: '⚔️ Fight erstellt!',
            description: `Erstellt von: ${interaction.user}`,
            fields: [
                { 
                    name: '👥 Teilnehmer', 
                    value: '*Noch keine Teilnehmer*', 
                    inline: false 
                },
                { 
                    name: '📊 Slots', 
                    value: `0/${slots}`, 
                    inline: true 
                }
            ],
            timestamp: new Date(),
            footer: { text: 'Nutze /add @user zum Hinzufügen' }
        };
        
        const message = await interaction.reply({ embeds: [embed], fetchReply: true });
        activeFights.set(message.id, fightData);
        
        console.log(`✅ Fight erstellt von ${interaction.user.tag} mit ${slots} Slots`);
    }
    
    else if (commandName === 'add') {
        // Prüfe ob der Command im richtigen Channel ist
        if (interaction.channelId !== FIGHT_CHANNEL_ID) {
            return await interaction.reply({
                content: `❌ Dieser Command kann nur in <#${FIGHT_CHANNEL_ID}> verwendet werden!`,
                ephemeral: true
            });
        }
        
        const user = interaction.options.getUser('user');
        const channelId = interaction.channelId;
        
        // Finde den letzten Fight in diesem Channel
        let targetFight = null;
        let targetMessageId = null;
        
        for (const [messageId, fightData] of activeFights.entries()) {
            if (fightData.channelId === channelId) {
                targetFight = fightData;
                targetMessageId = messageId;
            }
        }
        
        if (!targetFight) {
            return await interaction.reply({ 
                content: '❌ Kein aktiver Fight in diesem Channel gefunden!', 
                ephemeral: true 
            });
        }
        
        // Prüfe ob User bereits dabei ist
        if (targetFight.participants.some(p => p.id === user.id)) {
            return await interaction.reply({ 
                content: `❌ ${user} ist bereits im Fight!`, 
                ephemeral: true 
            });
        }
        
        // Prüfe ob noch Platz ist
        if (targetFight.participants.length >= targetFight.slots) {
            return await interaction.reply({ 
                content: '❌ Der Fight ist bereits voll!', 
                ephemeral: true 
            });
        }
        
        // Füge User hinzu
        targetFight.participants.push({ id: user.id, tag: user.tag });
        
        // Update die Nachricht
        await updateFightMessage(interaction.channel, targetMessageId, targetFight);
        
        await interaction.reply({ 
            content: `✅ ${user} wurde zum Fight hinzugefügt!`, 
            ephemeral: true 
        });
    }
    
    else if (commandName === 'remove') {
        // Prüfe ob der Command im richtigen Channel ist
        if (interaction.channelId !== FIGHT_CHANNEL_ID) {
            return await interaction.reply({
                content: `❌ Dieser Command kann nur in <#${FIGHT_CHANNEL_ID}> verwendet werden!`,
                ephemeral: true
            });
        }
        
        const user = interaction.options.getUser('user');
        const channelId = interaction.channelId;
        
        // Finde den letzten Fight in diesem Channel
        let targetFight = null;
        let targetMessageId = null;
        
        for (const [messageId, fightData] of activeFights.entries()) {
            if (fightData.channelId === channelId) {
                targetFight = fightData;
                targetMessageId = messageId;
            }
        }
        
        if (!targetFight) {
            return await interaction.reply({ 
                content: '❌ Kein aktiver Fight in diesem Channel gefunden!', 
                ephemeral: true 
            });
        }
        
        // Prüfe ob User dabei ist
        const userIndex = targetFight.participants.findIndex(p => p.id === user.id);
        if (userIndex === -1) {
            return await interaction.reply({ 
                content: `❌ ${user} ist nicht im Fight!`, 
                ephemeral: true 
            });
        }
        
        // Entferne User
        targetFight.participants.splice(userIndex, 1);
        
        // Update die Nachricht
        await updateFightMessage(interaction.channel, targetMessageId, targetFight);
        
        await interaction.reply({ 
            content: `✅ ${user} wurde aus dem Fight entfernt!`, 
            ephemeral: true 
        });
    }
    
    else if (commandName === 'camper') {
        // Prüfe ob der Command im richtigen Channel ist
        if (interaction.channelId !== CAMPER_CHANNEL_ID) {
            return await interaction.reply({
                content: `❌ Dieser Command kann nur in <#${CAMPER_CHANNEL_ID}> verwendet werden!`,
                ephemeral: true
            });
        }
        
        const minuten = interaction.options.getInteger('minuten');
        const milliseconds = minuten * 60 * 1000;
        
        // Bestätige den Timer-Start
        await interaction.reply({ 
            content: `⏰ Camper-Timer gestartet für ${minuten} Minute(n)! Du bekommst eine DM, wenn die Zeit vorbei ist.`, 
            ephemeral: true 
        });
        
        console.log(`⏰ Camper-Timer gestartet für ${interaction.user.tag}: ${minuten} Minuten`);
        
        // Starte den Timer
        setTimeout(async () => {
            try {
                // Versuche zuerst DM zu senden
                await interaction.user.send({
                    embeds: [{
                        color: 0x00ff00,
                        title: '🏕️ Camper fertig!',
                        description: `Dein Camper-Timer von **${minuten} Minute(n)** ist abgelaufen!`,
                        timestamp: new Date(),
                        footer: { text: 'T4L Bot' }
                    }]
                });
                console.log(`✅ Camper-DM gesendet an ${interaction.user.tag}`);
            } catch (error) {
                console.error(`❌ Konnte keine DM an ${interaction.user.tag} senden, versuche #camper Channel...`);
                
                // Falls DM fehlschlägt, sende in #camper Channel
                try {
                    const camperChannel = await client.channels.fetch(CAMPER_CHANNEL_ID);
                    
                    if (camperChannel) {
                        await camperChannel.send({
                            content: `${interaction.user}`,
                            embeds: [{
                                color: 0x00ff00,
                                title: '🏕️ Camper fertig!',
                                description: `Der Camper-Timer von **${minuten} Minute(n)** ist abgelaufen!`,
                                timestamp: new Date(),
                                footer: { text: 'T4L Bot - DMs sind deaktiviert' }
                            }]
                        });
                        console.log(`✅ Camper-Nachricht in #camper gesendet für ${interaction.user.tag}`);
                    }
                } catch (channelError) {
                    console.error('❌ Fehler beim Senden im #camper Channel:', channelError);
                }
            }
        }, milliseconds);
    }
});

// Hilfsfunktion zum Updaten der Fight-Nachricht
async function updateFightMessage(channel, messageId, fightData) {
    try {
        const message = await channel.messages.fetch(messageId);
        const creator = await client.users.fetch(fightData.creator);
        
        const participantsList = fightData.participants.length > 0
            ? fightData.participants.map((p, i) => `${i + 1}. <@${p.id}>`).join('\n')
            : '*Noch keine Teilnehmer*';
        
        const embed = {
            color: fightData.participants.length >= fightData.slots ? 0x00ff00 : 0xff0000,
            title: '⚔️ Fight',
            description: `Erstellt von: <@${creator.id}>`,
            fields: [
                { 
                    name: '👥 Teilnehmer', 
                    value: participantsList, 
                    inline: false 
                },
                { 
                    name: '📊 Slots', 
                    value: `${fightData.participants.length}/${fightData.slots}`, 
                    inline: true 
                }
            ],
            timestamp: new Date(),
            footer: { text: 'Nutze /add @user oder /remove @user' }
        };
        
        await message.edit({ embeds: [embed] });
    } catch (error) {
        console.error('Fehler beim Updaten der Fight-Nachricht:', error);
    }
}

// Event: Neue Nachricht
client.on('messageCreate', message => {
    // Ignoriere Bot-Nachrichten
    if (message.author.bot) return;
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
