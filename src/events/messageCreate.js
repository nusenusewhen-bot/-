const config = require('../../config');
const CarlEmbeds = require('../utils/embeds');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;
    
    // Auto-role assignment on first message (optional behavior)
    // (Real implementation would be on guildMemberAdd)
    
    // Prefix commands
    let prefix = config.prefix;
    if (!message.content.startsWith(prefix)) return;
    
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
    if (!command) return;
    
    // Permission check
    if (command.permissions) {
      const missing = message.channel.permissionsFor(message.member).missing(command.permissions);
      if (missing.length) {
        return message.reply({ embeds: [CarlEmbeds.error('Missing Permissions', `You need: ${missing.join(', ')}`)] });
      }
    }
    
    try {
      await command.execute(message, args, client);
    } catch (error) {
      console.error(error);
      message.reply({ embeds: [CarlEmbeds.error('Error', 'Command execution failed')] });
    }
  }
};
