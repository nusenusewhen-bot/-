require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { sequelize } = require('./src/models');
const winston = require('winston');

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

// Load handlers
require('./src/handlers/commandHandler')(client);
require('./src/handlers/eventHandler')(client); // Similar structure to command handler

// Database sync
sequelize.sync().then(() => {
  logger.info('Database synchronized');
}).catch(err => {
  logger.error('Database sync failed:', err);
});

client.once('ready', () => {
  logger.info(`Logged in as ${client.user.tag}`);
  client.user.setActivity('!help | Managing servers', { type: 'WATCHING' });
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  logger.error('Login failed:', err);
  process.exit(1);
});
