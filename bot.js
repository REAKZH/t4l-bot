const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, MessageFlags } = require('discord.js');
require('dotenv').config();

// Erstelle einen neuen Discord Client mit Keep-Alive
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ],
    // WebSocket Keep-Alive Einstellungen
    ws: {
        properties: {
            browser: 'Discord Client'
        }
    }
});

// Speicher für aktive Fights (messageId -> fight data)
const activeFights = new Map();

// Speicher für aktive Camper-Timer (userId -> timer data)
const activeCampers = new Map();

// Channel IDs
const FIGHT_CHANNEL_ID = '1438245823707353171';
const CAMPER_CHANNEL_ID = '1438896012155420682';

// Definiere Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName('fight')
        .setDescription('Fight Management')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Erstelle einen neuen Fight')
                .addIntegerOption(option =>
                    option.setName('slots')
                        .setDescription('Anzahl der verfügbaren Slots')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(22)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Füge einen User zum Fight hinzu')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Der User, der hinzugefügt werden soll')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('role')
                        .setDescription('Die Role des Users')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Anti', value: 'Anti' },
                            { name: 'Freestyle', value: 'Freestyle' },
                            { name: 'Masse', value: 'Masse' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Entferne einen User aus dem Fight')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Der User, der entfernt werden soll')
                        .setRequired(true))),
    new SlashCommandBuilder()
        .setName('camper')
        .setDescription('Camper Timer Management')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Starte einen Camper-Timer')
                .addIntegerOption(option =>
                    option.setName('minuten')
                        .setDescription('Zeit in Minuten')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1440)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Zeige verbleibende Zeit deines Camper-Timers'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Breche deinen Camper-Timer ab')),
].map(command => command.toJSON());

// Event: Bot ist bereit
client.once('ready', async () => {
    console.log(`✅ Bot ist online als ${client.user.tag}`);
    console.log(`🤖 Bot ID: ${client.user.id}`);
    console.log(`📊 In ${client.guilds.cache.size} Server(n)`);
    
    // Setze den Bot-Status
    client.user.setActivity('/fight create zum Starten', { type: 'WATCHING' });
    
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
    // Bot läuft weiter, crasht nicht
});

// Event: Warnung
client.on('warn', info => {
    console.warn('⚠️ Discord Client Warning:', info);
});

// Event: Disconnect - Auto Reconnect
client.on('disconnect', () => {
    console.warn('⚠️ Bot wurde disconnected, versuche Reconnect...');
});

// Event: Reconnecting
client.on('reconnecting', () => {
    console.log('🔄 Bot versucht sich neu zu verbinden...');
});

// Event: Resume
client.on('resume', () => {
    console.log('✅ Bot-Session wiederhergestellt');
});

// Event: Slash Command Interaktion
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    
    if (commandName === 'fight') {
        const subcommand = interaction.options.getSubcommand();
        
        // Prüfe ob der Command im richtigen Channel ist
        if (interaction.channelId !== FIGHT_CHANNEL_ID) {
            return await interaction.reply({
                content: `❌ Dieser Command kann nur in <#${FIGHT_CHANNEL_ID}> verwendet werden!`,
                flags: MessageFlags.Ephemeral
            });
        }
        
        if (subcommand === 'create') {
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
                footer: { text: 'Nutze /fight add @user zum Hinzufügen' }
            };
            
            const message = await interaction.reply({ embeds: [embed] });
            const fetchedMessage = await interaction.fetchReply();
            activeFights.set(fetchedMessage.id, fightData);
            
            console.log(`✅ Fight erstellt von ${interaction.user.tag} mit ${slots} Slots`);
        }
        
        else if (subcommand === 'add') {
            const user = interaction.options.getUser('user');
            const role = interaction.options.getString('role');
            const channelId = interaction.channelId;
            
            // Finde den letzten Fight in diesem Channel
            let targetFight = null;
            let targetMessageId = null;
            
            // Debug: Zeige alle aktiven Fights
            console.log(`🔍 Suche Fight in Channel ${channelId}`);
            console.log(`📊 Aktive Fights: ${activeFights.size}`);
            
            for (const [messageId, fightData] of activeFights.entries()) {
                console.log(`  - Fight Message ID: ${messageId}, Channel: ${fightData.channelId}`);
                if (fightData.channelId === channelId) {
                    targetFight = fightData;
                    targetMessageId = messageId;
                    console.log(`✅ Fight gefunden!`);
                }
            }
            
            if (!targetFight) {
                console.log(`❌ Kein Fight gefunden für Channel ${channelId}`);
                return await interaction.reply({ 
                    content: `❌ Kein aktiver Fight in diesem Channel gefunden! Bitte erstelle einen neuen Fight mit \`/fight create\`.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            // Prüfe ob die Nachricht noch existiert
            try {
                await interaction.channel.messages.fetch(targetMessageId);
            } catch (error) {
                // Nachricht wurde gelöscht
                activeFights.delete(targetMessageId);
                console.log(`🗑️ Fight-Nachricht ${targetMessageId} wurde gelöscht, entferne aus Cache`);
                return await interaction.reply({
                    content: '❌ Kein aktiver Fight in diesem Channel gefunden! Bitte erstelle einen neuen Fight mit `/fight create`.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Prüfe ob User bereits dabei ist
            if (targetFight.participants.some(p => p.id === user.id)) {
                return await interaction.reply({ 
                    content: `❌ ${user} ist bereits im Fight!`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            // Prüfe ob noch Platz ist
            if (targetFight.participants.length >= targetFight.slots) {
                return await interaction.reply({ 
                    content: '❌ Der Fight ist bereits voll!', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            // Füge User mit Role hinzu
            targetFight.participants.push({ id: user.id, tag: user.tag, role: role });
            
            // Update die Nachricht
            await updateFightMessage(interaction.channel, targetMessageId, targetFight);
            
            await interaction.reply({ 
                content: `✅ ${user} wurde als **${role}** zum Fight hinzugefügt!`, 
                flags: MessageFlags.Ephemeral 
            });
        }
        
        else if (subcommand === 'remove') {
            const user = interaction.options.getUser('user');
            const channelId = interaction.channelId;
            
            // Finde den letzten Fight in diesem Channel
            let targetFight = null;
            let targetMessageId = null;
            
            // Debug: Zeige alle aktiven Fights
            console.log(`🔍 Suche Fight in Channel ${channelId}`);
            console.log(`📊 Aktive Fights: ${activeFights.size}`);
            
            for (const [messageId, fightData] of activeFights.entries()) {
                console.log(`  - Fight Message ID: ${messageId}, Channel: ${fightData.channelId}`);
                if (fightData.channelId === channelId) {
                    targetFight = fightData;
                    targetMessageId = messageId;
                    console.log(`✅ Fight gefunden!`);
                }
            }
            
            if (!targetFight) {
                console.log(`❌ Kein Fight gefunden für Channel ${channelId}`);
                return await interaction.reply({ 
                    content: `❌ Kein aktiver Fight in diesem Channel gefunden!\n\nDebug Info:\n- Channel ID: ${channelId}\n- Aktive Fights: ${activeFights.size}`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            // Prüfe ob die Nachricht noch existiert
            try {
                await interaction.channel.messages.fetch(targetMessageId);
            } catch (error) {
                // Nachricht wurde gelöscht
                activeFights.delete(targetMessageId);
                console.log(`🗑️ Fight-Nachricht ${targetMessageId} wurde gelöscht, entferne aus Cache`);
                return await interaction.reply({
                    content: '❌ Der Fight wurde gelöscht! Bitte erstelle einen neuen Fight mit `/fight create`.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Prüfe ob User dabei ist
            const userIndex = targetFight.participants.findIndex(p => p.id === user.id);
            if (userIndex === -1) {
                return await interaction.reply({ 
                    content: `❌ ${user} ist nicht im Fight!`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            // Entferne User
            targetFight.participants.splice(userIndex, 1);
            
            // Update die Nachricht
            await updateFightMessage(interaction.channel, targetMessageId, targetFight);
            
            await interaction.reply({ 
                content: `✅ ${user} wurde aus dem Fight entfernt!`, 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
    
    else if (commandName === 'camper') {
        const subcommand = interaction.options.getSubcommand();
        
        // Prüfe ob der Command im richtigen Channel ist
        if (interaction.channelId !== CAMPER_CHANNEL_ID) {
            return await interaction.reply({
                content: `❌ Dieser Command kann nur in <#${CAMPER_CHANNEL_ID}> verwendet werden!`,
                flags: MessageFlags.Ephemeral
            });
        }
        
        if (subcommand === 'start') {
            const minuten = interaction.options.getInteger('minuten');
            const userId = interaction.user.id;
            
            // Prüfe ob User bereits einen Timer hat
            if (activeCampers.has(userId)) {
                return await interaction.reply({
                    content: '❌ Du hast bereits einen aktiven Timer! Nutze `/camper reset` um ihn abzubrechen.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const milliseconds = minuten * 60 * 1000;
            const endTime = Date.now() + milliseconds;
            
            // Erstelle Timer-Daten
            const timerData = {
                startTime: Date.now(),
                endTime: endTime,
                duration: minuten,
                timeoutId: null
            };
            
            // Bestätige den Timer-Start
            await interaction.reply({ 
                content: `⏰ Camper-Timer gestartet für **${minuten} Minute(n)**! Du bekommst eine DM, wenn die Zeit vorbei ist.\n\nNutze \`/camper info\` um die verbleibende Zeit zu sehen.`, 
                flags: MessageFlags.Ephemeral 
            });
            
            console.log(`⏰ Camper-Timer gestartet für ${interaction.user.tag}: ${minuten} Minuten`);
            
            // Starte den Timer
            const timeoutId = setTimeout(async () => {
                // *** WICHTIG: Entferne Timer aus Map SOFORT ***
                activeCampers.delete(userId);
                
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
            
            // Speichere Timeout-ID
            timerData.timeoutId = timeoutId;
            activeCampers.set(userId, timerData);
        }
        
        else if (subcommand === 'info') {
            const userId = interaction.user.id;
            
            if (!activeCampers.has(userId)) {
                return await interaction.reply({
                    content: '❌ Du hast keinen aktiven Camper-Timer!',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const timerData = activeCampers.get(userId);
            const remainingMs = timerData.endTime - Date.now();
            const remainingMinutes = Math.ceil(remainingMs / 60000);
            const remainingSeconds = Math.ceil((remainingMs % 60000) / 1000);
            
            const embed = {
                color: 0x3498db,
                title: '⏰ Camper Timer Info',
                fields: [
                    {
                        name: '⏱️ Gesamtdauer',
                        value: `${timerData.duration} Minute(n)`,
                        inline: true
                    },
                    {
                        name: '⏳ Verbleibende Zeit',
                        value: `${remainingMinutes} Minute(n) ${remainingSeconds} Sekunde(n)`,
                        inline: true
                    }
                ],
                timestamp: new Date(timerData.endTime),
                footer: { text: 'Timer endet um' }
            };
            
            await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });
        }
        
        else if (subcommand === 'reset') {
            const userId = interaction.user.id;
            
            if (!activeCampers.has(userId)) {
                return await interaction.reply({
                    content: '❌ Du hast keinen aktiven Camper-Timer!',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const timerData = activeCampers.get(userId);
            
            // Stoppe den Timer
            clearTimeout(timerData.timeoutId);
            activeCampers.delete(userId);
            
            console.log(`⏹️ Camper-Timer abgebrochen von ${interaction.user.tag}`);
            
            await interaction.reply({
                content: '✅ Dein Camper-Timer wurde erfolgreich abgebrochen!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
});

// Hilfsfunktion zum Updaten der Fight-Nachricht
async function updateFightMessage(channel, messageId, fightData) {
    try {
        const message = await channel.messages.fetch(messageId);
        const creator = await client.users.fetch(fightData.creator);
        
        let participantsList = '*Noch keine Teilnehmer*';
        
        if (fightData.participants.length > 0) {
            // Gruppiere Teilnehmer nach Rolle
            const roleGroups = {
                'Masse': [],
                'Anti': [],
                'Freestyle': []
            };
            
            fightData.participants.forEach(p => {
                if (roleGroups[p.role]) {
                    roleGroups[p.role].push(p);
                }
            });
            
            // Erstelle formatierte Liste
            const sections = [];
            
            if (roleGroups['Masse'].length > 0) {
                sections.push(`**Masse:**\n${roleGroups['Masse'].map(p => `<@${p.id}>`).join('\n')}`);
            }
            
            if (roleGroups['Anti'].length > 0) {
                sections.push(`**Anti:**\n${roleGroups['Anti'].map(p => `<@${p.id}>`).join('\n')}`);
            }
            
            if (roleGroups['Freestyle'].length > 0) {
                sections.push(`**Freestyle:**\n${roleGroups['Freestyle'].map(p => `<@${p.id}>`).join('\n')}`);
            }
            
            participantsList = sections.join('\n\n');
        }
        
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
            footer: { text: 'Nutze /fight add @user oder /fight remove @user' }
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
console.log('🔍 Token geladen:', process.env.DISCORD_TOKEN ? 'Ja ✅' : 'Nein ❌');
console.log('🔍 Token Länge:', process.env.DISCORD_TOKEN?.length || 0);

client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('🔐 Bot-Login erfolgreich');
    })
    .catch(error => {
        console.error('❌ Fehler beim Login:', error);
        process.exit(1);
    });

// Unhandled Promise Rejections abfangen (verhindert Crashes)
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Promise Rejection:', error);
    // Bot läuft weiter statt zu crashen
});

// Uncaught Exceptions abfangen
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Bei kritischen Fehlern: Log und continue (Fly.io startet neu wenn nötig)
});

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('\n⏹️ Bot wird heruntergefahren...');
    
    // Lösche alle aktiven Timer
    for (const [userId, timerData] of activeCampers.entries()) {
        clearTimeout(timerData.timeoutId);
    }
    activeCampers.clear();
    
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n⏹️ Bot wird heruntergefahren...');
    
    // Lösche alle aktiven Timer
    for (const [userId, timerData] of activeCampers.entries()) {
        clearTimeout(timerData.timeoutId);
    }
    activeCampers.clear();
    
    client.destroy();
    process.exit(0);
});
