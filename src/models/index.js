const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Use /tmp for Railway (writable), local for dev
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME;
const dbPath = isRailway 
  ? '/tmp/database.sqlite' 
  : path.join(__dirname, '../../data/database.sqlite');

// Ensure data folder exists locally
if (!isRailway) {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

const Tag = sequelize.define('Tag', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  guildId: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  authorId: { type: DataTypes.STRING, allowNull: false },
  uses: { type: DataTypes.INTEGER, defaultValue: 0 },
  cooldown: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const ReactionRole = sequelize.define('ReactionRole', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  guildId: { type: DataTypes.STRING, allowNull: false },
  messageId: { type: DataTypes.STRING, allowNull: false },
  channelId: { type: DataTypes.STRING, allowNull: false },
  emoji: { type: DataTypes.STRING, allowNull: false },
  roleId: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('toggle', 'unique', 'verify', 'drop'), defaultValue: 'toggle' }
});

const AutoRole = sequelize.define('AutoRole', {
  guildId: { type: DataTypes.STRING, primaryKey: true },
  roleId: { type: DataTypes.STRING, allowNull: false },
  delay: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Starboard = sequelize.define('Starboard', {
  guildId: { type: DataTypes.STRING, primaryKey: true },
  channelId: { type: DataTypes.STRING, allowNull: false },
  threshold: { type: DataTypes.INTEGER, defaultValue: 3 },
  emoji: { type: DataTypes.STRING, defaultValue: '⭐' }
});

const ModCase = sequelize.define('ModCase', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  guildId: { type: DataTypes.STRING, allowNull: false },
  targetId: { type: DataTypes.STRING, allowNull: false },
  moderatorId: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('ban', 'kick', 'mute', 'warn', 'unban'), allowNull: false },
  reason: { type: DataTypes.TEXT },
  duration: { type: DataTypes.STRING },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
});

module.exports = {
  sequelize,
  Tag,
  ReactionRole,
  AutoRole,
  Starboard,
  ModCase
};
