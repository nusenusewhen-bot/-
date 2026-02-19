const { ReactionRole } = require('../../models');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'reactionrole',
  aliases: ['rr', 'reactionroles'],
  description: 'Create reaction role messages',
  permissions: ['ManageRoles'],
  
  async execute(message, args) {
    if (!args[0]) {
      // Interactive setup
      const embed = new EmbedBuilder()
        .setTitle('Reaction Role Setup')
        .setDescription('React to this message with the emoji you want to use, then mention the role.');
      
      const msg = await message.channel.send({ embeds: [embed] });
      
      // Simple collector for demo (production would use awaitMessageComponent)
      const filter = (m) => m.author.id === message.author.id;
      message.channel.awaitMessages({ filter, max: 2, time: 60000, errors: ['time'] })
        .then(async collected => {
          const emojiMsg = collected.first();
          const roleMsg = collected.last();
          const role = roleMsg.mentions.roles.first();
          
          if (!role) return message.reply('No role mentioned');
          
          await msg.react(emojiMsg.content);
          await ReactionRole.create({
            guildId: message.guild.id,
            messageId: msg.id,
            channelId: message.channel.id,
            emoji: emojiMsg.content,
            roleId: role.id
          });
          
          message.reply('Reaction role created!');
        });
    }
  }
};
