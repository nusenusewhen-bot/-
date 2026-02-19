const { Tag } = require('../models');
const CarlEmbeds = require('../utils/embeds');
const { EmbedBuilder } = require('discord.js');

module.exports = [
  {
    name: 'tag',
    aliases: ['t', 'get'],
    description: 'Retrieve or manage tags',
    usage: '<name> | add <name> <content> | remove <name> | list',
    args: true,
    async execute(message, args) {
      const subCmd = args[0].toLowerCase();
      
      if (!['add', 'create', 'del', 'delete', 'remove', 'list'].includes(subCmd)) {
        const tagName = args[0].toLowerCase();
        const tag = await Tag.findOne({ where: { guildId: message.guild.id, name: tagName } });
        if (!tag) return message.reply({ embeds: [CarlEmbeds.error('Not Found', `Tag \`${tagName}\` doesn't exist.`)] });
        await tag.increment('uses');
        return message.channel.send({ embeds: [CarlEmbeds.tagEmbed(tag.content, message.author)] });
      }

      if (subCmd === 'add' || subCmd === 'create') {
        if (args.length < 3) return message.reply('Usage: `!tag add <name> <content>`');
        const name = args[1].toLowerCase();
        const content = args.slice(2).join(' ');
        const [tag, created] = await Tag.findOrCreate({
          where: { guildId: message.guild.id, name },
          defaults: { content, authorId: message.author.id }
        });
        if (!created) return message.reply({ embeds: [CarlEmbeds.error('Exists', 'This tag already exists.')] });
        return message.reply({ embeds: [CarlEmbeds.success('Tag Created', `Created tag \`${name}\``)] });
      }

      if (['del', 'delete', 'remove'].includes(subCmd)) {
        if (!args[1]) return message.reply('Provide a tag name');
        const name = args[1].toLowerCase();
        const tag = await Tag.findOne({ where: { guildId: message.guild.id, name } });
        if (!tag) return message.reply('Tag not found');
        if (tag.authorId !== message.author.id && !message.member.permissions.has('ManageMessages')) {
          return message.reply({ embeds: [CarlEmbeds.error('Permission Denied', 'Only the tag author or mods can delete tags.')] });
        }
        await tag.destroy();
        return message.reply({ embeds: [CarlEmbeds.success('Deleted', `Removed tag \`${name}\``)] });
      }

      if (subCmd === 'list') {
        const tags = await Tag.findAll({ where: { guildId: message.guild.id } });
        if (!tags.length) return message.reply('No tags found.');
        const list = tags.map(t => `\`${t.name}\` (${t.uses} uses)`).join(', ');
        return message.reply({ embeds: [new EmbedBuilder().setTitle('Server Tags').setDescription(list)] });
      }
    }
  }
];
