FROM node:18-alpine

# Setze das Arbeitsverzeichnis
WORKDIR /app

# Kopiere package.json
COPY package*.json ./

# Installiere Dependencies
RUN npm install --omit=dev

# Kopiere den Bot-Code
COPY . .

# Starte den Bot
CMD ["npm", "start"]
