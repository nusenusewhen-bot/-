const { ReactionRole, Starboard } = require('../models');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user) {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    
    // Reaction Roles
    const rr = await ReactionRole.findOne({
      where: {
        messageId: reaction.message.id,
        emoji: reaction.emoji.name || reaction.emoji.id
      }
    });
    
    if (rr) {
      const member = await reaction.message.guild.members.fetch(user.id);
      const role = reaction.message.guild.roles.cache.get(rr.roleId);
      if (!role) return;
      
      if (rr.type === 'toggle') {
        if (member.roles.cache.has(role.id)) {
          await member.roles.remove(role);
          await reaction.users.remove(user);
        } else {
          await member.roles.add(role);
        }
      } else if (rr.type === 'unique') {
        // Remove other roles in group (simplified)
        await member.roles.add(role);
      }
    }
    
    // Starboard
    const starboard = await Starboard.findOne({ where: { guildId: reaction.message.guildId } });
    if (starboard && reaction.emoji.name === starboard.emoji) {
      if (reaction.count >= starboard.threshold) {
        const boardChannel = reaction.message.guild.channels.cache.get(starboard.channelId);
        if (!boardChannel) return;
        
        const embed = new EmbedBuilder()
          .setAuthor({ name: reaction.message.author.tag, iconURL: reaction.message.author.displayAvatarURL() })
          .setDescription(reaction.message.content || '[No Content]')
          .addFields({ name: 'Source', value: `[Jump](${reaction.message.url})` })
          .setImage(reaction.message.attachments.first()?.url || null)
          .setFooter({ text: `${starboard.emoji} ${reaction.count}` });
          
        boardChannel.send({ embeds: [embed] });
      }
    }
  }
};
