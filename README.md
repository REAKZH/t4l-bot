# Discord Bot für Render.com

Ein einfacher Discord Bot, der auf Render.com gehostet werden kann.

## 📋 Voraussetzungen

- Ein Discord Account
- Ein GitHub Account
- Ein Render.com Account (kostenlos)
- Node.js 18+ (für lokale Entwicklung)

## 🚀 Schritt-für-Schritt Anleitung

### 1. Discord Bot erstellen

1. Gehe zum [Discord Developer Portal](https://discord.com/developers/applications)
2. Klicke auf **"New Application"**
3. Gib deinem Bot einen Namen und klicke auf **"Create"**
4. Gehe zum Tab **"Bot"** in der linken Seitenleiste
5. Klicke auf **"Add Bot"** und bestätige mit **"Yes, do it!"**
6. **Wichtig:** Aktiviere unter "Privileged Gateway Intents":
   - ✅ **Presence Intent**
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
7. Klicke auf **"Reset Token"** und kopiere den Token (du brauchst ihn später!)
   - ⚠️ **WICHTIG:** Teile diesen Token mit niemandem!

### 2. Bot zu deinem Discord Server einladen

1. Gehe im Developer Portal zum Tab **"OAuth2"** → **"URL Generator"**
2. Wähle folgende **Scopes** aus:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Wähle folgende **Bot Permissions** aus:
   - ✅ `Read Messages/View Channels`
   - ✅ `Send Messages`
   - ✅ `Read Message History`
   - (Weitere je nach Bedarf)
4. Kopiere die generierte URL unten auf der Seite
5. Öffne die URL in deinem Browser
6. Wähle deinen Server aus und klicke auf **"Autorisieren"**

### 3. Code zu GitHub hochladen

1. Erstelle ein neues Repository auf [GitHub](https://github.com/new)
2. Öffne ein Terminal in diesem Ordner und führe folgende Befehle aus:

```bash
git init
git add .
git commit -m "Initial commit: Discord Bot"
git branch -M main
git remote add origin https://github.com/DEIN_USERNAME/DEIN_REPO.git
git push -u origin main
```

### 4. Auf Render.com deployen

#### Option A: Automatisches Deployment mit render.yaml

1. Gehe zu [Render.com](https://render.com) und erstelle einen Account (oder logge dich ein)
2. Klicke auf **"New +"** → **"Blueprint"**
3. Verbinde dein GitHub Repository
4. Render erkennt automatisch die `render.yaml` Datei
5. Klicke auf **"Apply"**

#### Option B: Manuelles Deployment

1. Gehe zu [Render.com](https://render.com) und erstelle einen Account (oder logge dich ein)
2. Klicke auf **"New +"** → **"Background Worker"** (nicht Web Service!)
3. Verbinde dein GitHub Repository
4. Konfiguration:
   - **Name:** `t4l-bot` (oder ein anderer Name)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Wähle **"Free"**

### 5. Umgebungsvariablen hinzufügen

1. Scrolle nach unten zu **"Environment Variables"**
2. Klicke auf **"Add Environment Variable"**
3. Füge folgende Variable hinzu:
   - **Key:** `DISCORD_TOKEN`
   - **Value:** Dein Discord Bot Token (den du in Schritt 1 kopiert hast)
4. Klicke auf **"Create Background Worker"** oder **"Save Changes"**

### 6. Bot überprüfen

1. Warte, bis das Deployment abgeschlossen ist (ca. 2-5 Minuten)
2. Klicke auf **"Logs"**, um zu sehen, ob der Bot erfolgreich gestartet ist
3. Du solltest folgende Meldung sehen:
   ```
   ✅ Bot ist online als DEIN_BOT_NAME#1234
   🔐 Bot-Login erfolgreich
   ```
4. Gehe zu deinem Discord Server - der Bot sollte jetzt online sein! 🎉

## 🔄 Updates deployen

Jedes Mal, wenn du Änderungen zu GitHub pushst, wird Render automatisch ein neues Deployment starten:

```bash
git add .
git commit -m "Deine Änderung"
git push
```

## 📝 Bot erweitern

Der Bot ist aktuell noch sehr einfach gehalten. Du kannst Funktionen hinzufügen, indem du `bot.js` bearbeitest:

### Beispiel: Ping Command

Füge in der `messageCreate` Event-Funktion folgenden Code hinzu:

```javascript
client.on('messageCreate', message => {
    if (message.author.bot) return;
    
    if (message.content === '!ping') {
        message.reply('Pong! 🏓');
    }
});
```

## 🛠️ Lokale Entwicklung

1. Erstelle eine `.env` Datei:
   ```bash
   copy .env.example .env
   ```

2. Füge deinen Discord Token in die `.env` Datei ein

3. Installiere Dependencies:
   ```bash
   npm install
   ```

4. Starte den Bot:
   ```bash
   npm start
   ```

## 📊 Wichtige Hinweise zu Render.com (Free Tier)

- ⚠️ **Background Worker werden nach 15 Minuten Inaktivität heruntergefahren**
- Um deinen Bot 24/7 online zu halten, benötigst du einen bezahlten Plan ($7/Monat)
- Alternative: Verwende einen "Web Service" und implementiere einen einfachen HTTP-Server

## 🔧 Troubleshooting

### Bot geht offline

- Überprüfe die Logs auf Render.com
- Stelle sicher, dass der Discord Token korrekt eingetragen ist
- Prüfe, ob alle Intents im Discord Developer Portal aktiviert sind

### Bot kann keine Nachrichten lesen

- Aktiviere die **Message Content Intent** im Discord Developer Portal
- Stelle sicher, dass der Bot die richtigen Berechtigungen auf deinem Server hat

### Deployment schlägt fehl

- Überprüfe, ob `package.json` korrekt ist
- Stelle sicher, dass Node.js Version 18+ in der `package.json` angegeben ist

## 📚 Weitere Ressourcen

- [Discord.js Guide](https://discordjs.guide/)
- [Discord.js Dokumentation](https://discord.js.org/)
- [Render.com Dokumentation](https://render.com/docs)

## 📄 Lizenz

ISC

---

**Viel Erfolg mit deinem Discord Bot! 🤖**
