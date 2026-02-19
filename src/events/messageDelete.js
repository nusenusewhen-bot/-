const { snipes } = require('../commands/utility');

module.exports = {
  name: 'messageDelete',
  async execute(message) {
    if (message.author?.bot) return;
    
    const existing = snipes.get(message.channel.id) || [];
    
    const snipeData = {
      content: message.content,
      author: {
        tag: message.author?.tag || 'Unknown',
        avatar: message.author?.displayAvatarURL() || null
      },
      time: Date.now(),
      image: message.attachments.first()?.proxyURL || null,
      attachments: message.attachments.map(a => a.proxyURL)
    };
    
    existing.unshift(snipeData);
    if (existing.length > 10) existing.pop(); // Keep only 10
    
    snipes.set(message.channel.id, existing);
  }
};
