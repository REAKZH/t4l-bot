# Discord Bot für Fly.io

Ein einfacher Discord Bot, der kostenlos auf Fly.io gehostet werden kann.

## 📋 Voraussetzungen

- Ein Discord Account
- Ein Fly.io Account (kostenlos)
- Git installiert (https://git-scm.com/download/win)
- Node.js 18+ (für lokale Entwicklung, optional)

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

### 3. Fly.io CLI installieren

1. Öffne PowerShell als Administrator
2. Installiere Fly.io CLI:
   ```powershell
   iwr https://fly.io/install.ps1 -useb | iex
   ```
3. Schließe PowerShell und öffne es neu
4. Teste die Installation:
   ```powershell
   fly version
   ```

### 4. Bei Fly.io anmelden

1. Erstelle einen Account auf [Fly.io](https://fly.io/app/sign-up)
2. Melde dich in der CLI an:
   ```powershell
   fly auth login
   ```
3. Dein Browser öffnet sich - logge dich ein

### 5. Bot auf Fly.io deployen

1. Navigiere in deinem Terminal zum Bot-Ordner:
   ```powershell
   cd "D:\Documents\GitHub\t4l-bot"
   ```

2. Erstelle eine neue Fly.io App:
   ```powershell
   fly launch
   ```
   - Wähle einen App-Namen (z.B. `mein-discord-bot-123`)
   - Region: **Amsterdam (ams)** empfohlen für Europa
   - Bei "Would you like to set up a PostgreSQL database?": **Nein (n)**
   - Bei "Would you like to set up an Upstash Redis database?": **Nein (n)**
   - Bei "Would you like to deploy now?": **Nein (n)** - wir müssen erst den Token setzen!

3. Setze den Discord Token als Secret:
   ```powershell
   fly secrets set DISCORD_TOKEN="DEIN_BOT_TOKEN_HIER"
   ```
   ⚠️ Ersetze `DEIN_BOT_TOKEN_HIER` mit deinem echten Token!

4. Jetzt deployen:
   ```powershell
   fly deploy
   ```

### 6. Bot überprüfen

1. Warte, bis das Deployment abgeschlossen ist (ca. 1-3 Minuten)
2. Überprüfe die Logs:
   ```powershell
   fly logs
   ```
3. Du solltest folgende Meldung sehen:
   ```
   ✅ Bot ist online als DEIN_BOT_NAME#1234
   🔐 Bot-Login erfolgreich
   ```
4. Gehe zu deinem Discord Server - der Bot sollte jetzt online sein! 🎉

## 🔄 Updates deployen

Wenn du Änderungen am Bot machst, deploye einfach neu:

```powershell
fly deploy
```

## 📊 Nützliche Fly.io Befehle

```powershell
# Logs anzeigen
fly logs

# Bot-Status prüfen
fly status

# SSH-Zugang zur App (für Debugging)
fly ssh console

# App stoppen
fly scale count 0

# App starten
fly scale count 1

# Secrets anzeigen (nicht die Werte!)
fly secrets list

# App löschen
fly apps destroy DEIN_APP_NAME
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

## � Kosten und Limits (Fly.io Free Tier)

- ✅ **Komplett kostenlos** für kleine Bots
- Inklusive: 3 VMs mit je 256MB RAM
- Dein Bot läuft 24/7 ohne Abschaltung
- Mehr als genug für einen einfachen Discord Bot
- Keine Kreditkarte erforderlich (aber empfohlen für bessere Limits)

## 🔧 Troubleshooting

### Bot geht offline

- Überprüfe die Logs mit `fly logs`
- Stelle sicher, dass der Discord Token korrekt gesetzt ist: `fly secrets list`
- Prüfe den App-Status: `fly status`
- Stelle sicher, dass alle Intents im Discord Developer Portal aktiviert sind

### Bot kann keine Nachrichten lesen

- Aktiviere die **Message Content Intent** im Discord Developer Portal
- Stelle sicher, dass der Bot die richtigen Berechtigungen auf deinem Server hat

### Deployment schlägt fehl

- Überprüfe, ob der `Dockerfile` korrekt ist
- Stelle sicher, dass die `fly.toml` existiert
- Probiere: `fly deploy --verbose` für detaillierte Fehlerinfos

### "Error: git is not installed"

- Installiere Git: https://git-scm.com/download/win
- Starte VS Code/Terminal neu nach der Installation

## 📚 Weitere Ressourcen

- [Discord.js Guide](https://discordjs.guide/)
- [Discord.js Dokumentation](https://discord.js.org/)
- [Fly.io Dokumentation](https://fly.io/docs)
- [Fly.io Discord Bot Guide](https://fly.io/docs/app-guides/discord-bot/)

## ⚡ Schnellstart-Zusammenfassung

```powershell
# 1. Git installieren (falls noch nicht geschehen)
# Download: https://git-scm.com/download/win

# 2. Fly.io CLI installieren
iwr https://fly.io/install.ps1 -useb | iex

# 3. Bei Fly.io anmelden
fly auth login

# 4. Zum Projekt-Ordner navigieren
cd "D:\Documents\GitHub\t4l-bot"

# 5. App erstellen und deployen
fly launch
fly secrets set DISCORD_TOKEN="DEIN_BOT_TOKEN"
fly deploy

# 6. Logs anschauen
fly logs
```

## 📄 Lizenz

ISC

---

**Viel Erfolg mit deinem Discord Bot! 🤖**
