const { ReactionRole, Starboard } = require('../models');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const CarlEmbeds = require('../utils/embeds');

module.exports = [
  {
    name: 'reactionrole',
    aliases: ['rr'],
    description: 'Create reaction role',
    usage: 'create <messageID> <emoji> <@role>',
    permissions: [PermissionFlagsBits.ManageRoles],
    async execute(message, args) {
      if (args[0] !== 'create') return message.reply('Usage: `!rr create <msgID> <emoji> @role`');
      const msg = await message.channel.messages.fetch(args[1]).catch(() => null);
      if (!msg) return message.reply('Message not found');
      const emoji = args[2];
      const role = message.mentions.roles.first();
      if (!role) return message.reply('Mention a role');
      
      await msg.react(emoji);
      await ReactionRole.create({
        guildId: message.guild.id,
        messageId: msg.id,
        channelId: message.channel.id,
        emoji: emoji,
        roleId: role.id
      });
      return message.reply({ embeds: [CarlEmbeds.success('Reaction Role Created', `React with ${emoji} to get ${role.name}`)] });
    }
  },
  {
    name: 'starboard',
    description: 'Setup starboard',
    usage: '<#channel> [threshold]',
    permissions: [PermissionFlagsBits.ManageGuild],
    async execute(message, args) {
      const channel = message.mentions.channels.first();
      if (!channel) return message.reply('Mention a channel');
      const threshold = parseInt(args[1]) || 3;
      await Starboard.upsert({ guildId: message.guild.id, channelId: channel.id, threshold });
      return message.reply({ embeds: [CarlEmbeds.success('Starboard Set', `Starboard set to ${channel.name} with ${threshold} stars needed`)] });
    }
  },
  {
    name: 'prefix',
    description: 'Change bot prefix',
    usage: '<newprefix>',
    permissions: [PermissionFlagsBits.ManageGuild],
    async execute(message, args) {
      if (!args[0]) return message.reply('Provide a prefix');
      // Would need to add prefix to database, using config for now
      return message.reply('Prefix change requires database update. Edit config.js for now.');
    }
  }
];
