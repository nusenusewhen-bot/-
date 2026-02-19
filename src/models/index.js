const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../data/database.sqlite'),
  logging: false
});

// Tags/Custom Commands (Carl-bot's signature feature)
const Tag = sequelize.define('Tag', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  guildId: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  authorId: { type: DataTypes.STRING, allowNull: false },
  uses: { type: DataTypes.INTEGER, defaultValue: 0 },
  cooldown: { type: DataTypes.INTEGER, defaultValue: 0 }
});

// Reaction Roles
const ReactionRole = sequelize.define('ReactionRole', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  guildId: { type: DataTypes.STRING, allowNull: false },
  messageId: { type: DataTypes.STRING, allowNull: false },
  channelId: { type: DataTypes.STRING, allowNull: false },
  emoji: { type: DataTypes.STRING, allowNull: false },
  roleId: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('toggle', 'unique', 'verify', 'drop'), defaultValue: 'toggle' }
});

// Auto Roles
const AutoRole = sequelize.define('AutoRole', {
  guildId: { type: DataTypes.STRING, primaryKey: true },
  roleId: { type: DataTypes.STRING, allowNull: false },
  delay: { type: DataTypes.INTEGER, defaultValue: 0 } // minutes
});

// Starboard
const Starboard = sequelize.define('Starboard', {
  guildId: { type: DataTypes.STRING, primaryKey: true },
  channelId: { type: DataTypes.STRING, allowNull: false },
  threshold: { type: DataTypes.INTEGER, defaultValue: 3 },
  emoji: { type: DataTypes.STRING, defaultValue: '⭐' }
});

// Moderation Logs
const ModCase = sequelize.define('ModCase', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  guildId: { type: DataTypes.STRING, allowNull: false },
  targetId: { type: DataTypes.STRING, allow
