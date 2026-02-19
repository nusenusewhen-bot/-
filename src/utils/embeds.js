const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

class CarlEmbeds {
  static success(title, description) {
    return new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle(`${config.emojis.success} ${title}`)
      .setDescription(description)
      .setTimestamp();
  }

  static error(title, description) {
    return new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle(`${config.emojis.error} ${title}`)
      .setDescription(description)
      .setTimestamp();
  }

  static log(guild, action, moderator, target, reason, color = config.colors.primary) {
    return new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
      .setTitle(`Case #${Math.floor(Math.random() * 10000)} | ${action}`)
      .addFields(
        { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: `${moderator.tag}`, inline: true },
        { name: 'Reason', value: reason || 'No reason provided' }
      )
      .setTimestamp();
  }

  static tagEmbed(content, author) {
    return new EmbedBuilder()
      .setColor(config.colors.primary)
      .setDescription(content)
      .setFooter({ text: `Requested by ${author.tag}`, iconURL: author.displayAvatarURL() });
  }
}

module.exports = CarlEmbeds;
