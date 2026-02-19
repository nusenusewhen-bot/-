const { PermissionFlagsBits } = require('discord.js');
const { ModCase } = require('../../models');
const CarlEmbeds = require('../../utils/embeds');

module.exports = {
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
    
    await ModCase.create({
      guildId: message.guild.id,
      targetId: target.id,
      moderatorId: message.author.id,
      type: 'ban',
      reason
    });
    
    // DM user
    await target.send({ embeds: [CarlEmbeds.error(`Banned from ${message.guild.name}`, `**Reason:** ${reason}`)] }).catch(() => {});
    
    return message.reply({ embeds: [CarlEmbeds.success('User Banned', `Banned ${target.user.tag} | ${reason}`)] });
  }
};
