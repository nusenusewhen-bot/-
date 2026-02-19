const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { ModCase } = require('../models');
const CarlEmbeds = require('../utils/embeds');

module.exports = [
  {
    name: 'ban',
    description: 'Ban a user from the server',
    usage: '<user> [reason]',
    permissions: [PermissionFlagsBits.BanMembers],
    async execute(message, args) {
      if (!args[0]) return message.reply('Provide a user');
      const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
      if (!target) return message.reply('User not found');
      if (!target.bannable) return message.reply('I cannot ban this user');
      const reason = args.slice(1).join(' ') || 'No reason provided';
      await target.ban({ reason: `${message.author.tag}: ${reason}` });
      await ModCase.create({ guildId: message.guild.id, targetId: target.id, moderatorId: message.author.id, type: 'ban', reason });
      await target.send({ embeds: [CarlEmbeds.error(`Banned from ${message.guild.name}`, `**Reason:** ${reason}`)] }).catch(() => {});
      return message.reply({ embeds: [CarlEmbeds.success('User Banned', `Banned ${target.user.tag} | ${reason}`)] });
    }
  },
  {
    name: 'kick',
    description: 'Kick a user from the server',
    usage: '<user> [reason]',
    permissions: [PermissionFlagsBits.KickMembers],
    async execute(message, args) {
      if (!args[0]) return message.reply('Provide a user');
      const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
      if (!target) return message.reply('User not found');
      if (!target.kickable) return message.reply('I cannot kick this user');
      const reason = args.slice(1).join(' ') || 'No reason provided';
      await target.kick(`${message.author.tag}: ${reason}`);
      await ModCase.create({ guildId: message.guild.id, targetId: target.id, moderatorId: message.author.id, type: 'kick', reason });
      await target.send({ embeds: [CarlEmbeds.error(`Kicked from ${message.guild.name}`, `**Reason:** ${reason}`)] }).catch(() => {});
      return message.reply({ embeds: [CarlEmbeds.success('User Kicked', `Kicked ${target.user.tag} | ${reason}`)] });
    }
  },
  {
    name: 'mute',
    description: 'Timeout/mute a user',
    usage: '<user> [duration] [reason]',
    permissions: [PermissionFlagsBits.ModerateMembers],
    async execute(message, args) {
      if (!args[0]) return message.reply('Provide a user');
      const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
      if (!target) return message.reply('User not found');
      if (!target.moderatable) return message.reply('I cannot mute this user');
      const duration = args[1] || '1h';
      const reason = args.slice(2).join(' ') || 'No reason provided';
      const ms = require('ms');
      const time = ms(duration);
      if (!time) return message.reply('Invalid duration. Use: 1h, 30m, 1d');
      await target.timeout(time, `${message.author.tag}: ${reason}`);
      await ModCase.create({ guildId: message.guild.id, targetId: target.id, moderatorId: message.author.id, type: 'mute', reason, duration });
      return message.reply({ embeds: [CarlEmbeds.success('User Muted', `Muted ${target.user.tag} for ${duration} | ${reason}`)] });
    }
  },
  {
    name: 'unmute',
    description: 'Remove timeout from a user',
    usage: '<user> [reason]',
    permissions: [PermissionFlagsBits.ModerateMembers],
    async execute(message, args) {
      if (!args[0]) return message.reply('Provide a user');
      const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
      if (!target) return message.reply('User not found');
      if (!target.isCommunicationDisabled()) return message.reply('User is not muted');
      await target.timeout(null);
      return message.reply({ embeds: [CarlEmbeds.success('User Unmuted', `Removed timeout from ${target.user.tag}`)] });
    }
  },
  {
    name: 'warn',
    description: 'Warn a user',
    usage: '<user> [reason]',
    permissions: [PermissionFlagsBits.ModerateMembers],
    async execute(message, args) {
      if (!args[0]) return message.reply('Provide a user');
      const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
      if (!target) return message.reply('User not found');
      const reason = args.slice(1).join(' ') || 'No reason provided';
      await ModCase.create({ guildId: message.guild.id, targetId: target.id, moderatorId: message.author.id, type: 'warn', reason });
      await target.send({ embeds: [CarlEmbeds.error(`Warned in ${message.guild.name}`, `**Reason:** ${reason}`)] }).catch(() => {});
      return message.reply({ embeds: [CarlEmbeds.success('User Warned', `Warned ${target.user.tag} | ${reason}`)] });
    }
  },
  {
    name: 'unban',
    description: 'Unban a user by ID',
    usage: '<userID>',
    permissions: [PermissionFlagsBits.BanMembers],
    async execute(message, args) {
      if (!args[0]) return message.reply('Provide a user ID');
      const bans = await message.guild.bans.fetch();
      if (!bans.has(args[0])) return message.reply('User is not banned');
      await message.guild.members.unban(args[0]);
      return message.reply({ embeds: [CarlEmbeds.success('User Unbanned', `Unbanned user ID: ${args[0]}`)] });
    }
  },
  {
    name: 'purge',
    aliases: ['clear'],
    description: 'Delete messages',
    usage: '<amount>',
    permissions: [PermissionFlagsBits.ManageMessages],
    async execute(message, args) {
      const amount = parseInt(args[0]);
      if (!amount || amount < 1 || amount > 100) return message.reply('Provide a number between 1-100');
      await message.channel.bulkDelete(amount + 1);
      const msg = await message.channel.send({ embeds: [CarlEmbeds.success('Messages Deleted', `Deleted ${amount} messages`)] });
      setTimeout(() => msg.delete(), 5000);
    }
  },
  {
    name: 'slowmode',
    description: 'Set channel slowmode',
    usage: '<seconds>',
    permissions: [PermissionFlagsBits.ManageChannels],
    async execute(message, args) {
      const seconds = parseInt(args[0]);
      if (isNaN(seconds) || seconds < 0 || seconds > 21600) return message.reply('Provide seconds (0-21600)');
      await message.channel.setRateLimitPerUser(seconds);
      return message.reply({ embeds: [CarlEmbeds.success('Slowmode Set', `Set slowmode to ${seconds} seconds`)] });
    }
  },
  {
    name: 'lock',
    description: 'Lock a channel',
    usage: '[#channel]',
    permissions: [PermissionFlagsBits.ManageChannels],
    async execute(message, args) {
      const channel = message.mentions.channels.first() || message.channel;
      await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
      return message.reply({ embeds: [CarlEmbeds.success('Channel Locked', `Locked ${channel.name}`)] });
    }
  },
  {
    name: 'unlock',
    description: 'Unlock a channel',
    usage: '[#channel]',
    permissions: [PermissionFlagsBits.ManageChannels],
    async execute(message, args) {
      const channel = message.mentions.channels.first() || message.channel;
      await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: null });
      return message.reply({ embeds: [CarlEmbeds.success('Channel Unlocked', `Unlocked ${channel.name}`)] });
    }
  },
  {
    name: 'nickname',
    aliases: ['nick'],
    description: 'Change a user nickname',
    usage: '<user> [nickname]',
    permissions: [PermissionFlagsBits.ManageNicknames],
    async execute(message, args) {
      if (!args[0]) return message.reply('Provide a user');
      const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
      if (!target) return message.reply('User not found');
      const nick = args.slice(1).join(' ') || null;
      await target.setNickname(nick);
      return message.reply({ embeds: [CarlEmbeds.success('Nickname Changed', `Set ${target.user.tag}'s nickname to ${nick || 'none'}`)] });
    }
  }
];
