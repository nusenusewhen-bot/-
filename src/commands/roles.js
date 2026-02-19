const { PermissionFlagsBits } = require('discord.js');
const { AutoRole } = require('../models');
const CarlEmbeds = require('../utils/embeds');

module.exports = [
  {
    name: 'role',
    description: 'Give or remove a role',
    usage: '<@user> <@role> [remove]',
    permissions: [PermissionFlagsBits.ManageRoles],
    async execute(message, args) {
      if (args.length < 2) return message.reply('Usage: `!role @user @role` or `!role @user @role remove`');
      const target = message.mentions.members.first();
      const role = message.mentions.roles.first();
      if (!target || !role) return message.reply('Mention a user and role');
      const remove = args[2]?.toLowerCase() === 'remove';
      
      if (remove) {
        await target.roles.remove(role);
        return message.reply({ embeds: [CarlEmbeds.success('Role Removed', `Removed ${role.name} from ${target.user.tag}`)] });
      } else {
        await target.roles.add(role);
        return message.reply({ embeds: [CarlEmbeds.success('Role Added', `Added ${role.name} to ${target.user.tag}`)] });
      }
    }
  },
  {
    name: 'autorole',
    description: 'Set automatic role on join',
    usage: '<@role | none>',
    permissions: [PermissionFlagsBits.ManageGuild],
    async execute(message, args) {
      const role = message.mentions.roles.first();
      if (!role) {
        await AutoRole.destroy({ where: { guildId: message.guild.id } });
        return message.reply({ embeds: [CarlEmbeds.success('AutoRole Disabled', 'Removed autorole')] });
      }
      await AutoRole.upsert({ guildId: message.guild.id, roleId: role.id });
      return message.reply({ embeds: [CarlEmbeds.success('AutoRole Set', `New members will get ${role.name}`)] });
    }
  },
  {
    name: 'temprole',
    description: 'Give a temporary role',
    usage: '<@user> <@role> <duration>',
    permissions: [PermissionFlagsBits.ManageRoles],
    async execute(message, args) {
      if (args.length < 3) return message.reply('Usage: `!temprole @user @role 1h`');
      const target = message.mentions.members.first();
      const role = message.mentions.roles.first();
      const duration = args[2];
      if (!target || !role) return message.reply('Mention a user and role');
      const ms = require('ms');
      const time = ms(duration);
      if (!time) return message.reply('Invalid duration');
      
      await target.roles.add(role);
      message.reply({ embeds: [CarlEmbeds.success('Temp Role Given', `Gave ${role.name} to ${target.user.tag} for ${duration}`)] });
      
      setTimeout(async () => {
        await target.roles.remove(role).catch(() => {});
        message.channel.send(`${target.user}'s temporary role ${role.name} has been removed.`);
      }, time);
    }
  },
  {
    name: 'roleall',
    description: 'Give role to all members',
    usage: '<@role>',
    permissions: [PermissionFlagsBits.ManageRoles],
    async execute(message, args) {
      const role = message.mentions.roles.first();
      if (!role) return message.reply('Mention a role');
      const members = await message.guild.members.fetch();
      let count = 0;
      for (const [, member] of members) {
        if (!member.roles.cache.has(role.id)) {
          await member.roles.add(role).catch(() => {});
          count++;
        }
      }
      return message.reply({ embeds: [CarlEmbeds.success('Role Given', `Gave ${role.name} to ${count} members`)] });
    }
  }
];
