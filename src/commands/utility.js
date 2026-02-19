const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const CarlEmbeds = require('../utils/embeds');

// Snipe storage - max 10 messages per channel, 2 hour expiry
const snipes = new Map();

// Cleanup old snipes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [channelId, messages] of snipes) {
    const filtered = messages.filter(m => now - m.time < 7200000); // 2 hours
    if (filtered.length === 0) snipes.delete(channelId);
    else snipes.set(channelId, filtered);
  }
}, 300000);

module.exports = [
  {
    name: 'help',
    aliases: ['h', 'commands', 'cmds'],
    description: 'List all commands',
    usage: '[command]',
    async execute(message, args, client) {
      if (args[0]) {
        const cmd = client.commands.get(args[0]) || client.commands.get(client.aliases.get(args[0]));
        if (!cmd) return message.reply('Command not found');
        
        const embed = new EmbedBuilder()
          .setTitle(`!${cmd.name}`)
          .setDescription(cmd.description || 'No description')
          .addFields(
            { name: 'Usage', value: `\`!${cmd.name} ${cmd.usage || ''}\``, inline: true },
            { name: 'Aliases', value: cmd.aliases?.join(', ') || 'None', inline: true }
          )
          .setColor('#3498db');
        return message.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setTitle('📋 Commands')
        .setDescription(`Prefix: \`!\` • ${client.commands.size} commands`)
        .setColor('#3498db')
        .addFields(
          { 
            name: '🔨 Moderation (11)', 
            value: '`ban` `kick` `mute` `unmute` `warn` `unban` `purge` `slowmode` `lock` `unlock` `nickname`',
            inline: false 
          },
          { 
            name: '🛠️ Utility (16)', 
            value: '`say` `embed` `avatar` `serverinfo` `userinfo` `roleinfo` `channelinfo` `poll` `remind` `calc` `roll` `flip` `choose` `8ball` `snipe` `help`',
            inline: false 
          },
          { 
            name: '👤 Roles (4)', 
            value: '`role` `autorole` `temprole` `roleall`',
            inline: false 
          },
          { 
            name: '🏷️ Tags (1)', 
            value: '`tag`',
            inline: false 
          },
          { 
            name: '⚙️ Config (3)', 
            value: '`reactionrole` `starboard` `prefix`',
            inline: false 
          }
        )
        .setFooter({ text: '!help <command> for details' });

      return message.reply({ embeds: [embed] });
    }
  },
  {
    name: 'snipe',
    aliases: ['s'],
    description: 'Show recently deleted messages',
    usage: '[number]',
    async execute(message, args) {
      const channelSnipes = snipes.get(message.channel.id);
      if (!channelSnipes || channelSnipes.length === 0) {
        return message.reply({ embeds: [CarlEmbeds.error('Nothing to snipe', 'No recently deleted messages in this channel.')] });
      }

      const index = parseInt(args[0]) || 1;
      if (index < 1 || index > channelSnipes.length) {
        return message.reply(`Provide a number between 1-${channelSnipes.length}`);
      }

      const snipe = channelSnipes[index - 1];
      const timeAgo = Math.floor((Date.now() - snipe.time) / 1000 / 60); // minutes

      const embed = new EmbedBuilder()
        .setAuthor({ name: snipe.author.tag, iconURL: snipe.author.avatar })
        .setDescription(snipe.content || '*No text content*')
        .setColor('#3498db')
        .setFooter({ text: `Deleted ${timeAgo}m ago • ${index}/${channelSnipes.length}` })
        .setTimestamp(snipe.time);

      if (snipe.image) embed.setImage(snipe.image);
      if (snipe.attachments.length > 0 && !snipe.image) {
        embed.addFields({ name: 'Attachments', value: snipe.attachments.join('\n') });
      }

      return message.reply({ embeds: [embed] });
    }
  },
  {
    name: 'say',
    description: 'Make the bot say something',
    usage: '<message>',
    permissions: ['ManageMessages'],
    async execute(message, args) {
      if (!args.length) return message.reply('Provide a message');
      await message.delete();
      return message.channel.send(args.join(' '));
    }
  },
  {
    name: 'embed',
    description: 'Send an embed message',
    usage: '<title> | <description> | [color]',
    permissions: ['ManageMessages'],
    async execute(message, args) {
      const text = args.join(' ').split('|');
      if (text.length < 2) return message.reply('Format: `!embed Title | Description | #color`');
      const embed = new EmbedBuilder()
        .setTitle(text[0].trim())
        .setDescription(text[1].trim())
        .setColor(text[2]?.trim() || '#3498db')
        .setTimestamp();
      await message.delete();
      return message.channel.send({ embeds: [embed] });
    }
  },
  {
    name: 'avatar',
    aliases: ['av'],
    description: 'Get user avatar',
    usage: '[@user]',
    async execute(message, args) {
      const target = message.mentions.users.first() || message.author;
      const embed = new EmbedBuilder()
        .setTitle(`${target.username}'s Avatar`)
        .setImage(target.displayAvatarURL({ size: 4096, dynamic: true }))
        .setColor('#3498db');
      return message.reply({ embeds: [embed] });
    }
  },
  {
    name: 'serverinfo',
    aliases: ['si'],
    description: 'Server information',
    async execute(message) {
      const guild = message.guild;
      const embed = new EmbedBuilder()
        .setTitle(guild.name)
        .setThumbnail(guild.iconURL())
        .addFields(
          { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Members', value: guild.memberCount.toString(), inline: true },
          { name: 'Channels', value: guild.channels.cache.size.toString(), inline: true },
          { name: 'Roles', value: guild.roles.cache.size.toString(), inline: true },
          { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Boosts', value: guild.premiumSubscriptionCount?.toString() || '0', inline: true }
        )
        .setColor('#3498db')
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }
  },
  {
    name: 'userinfo',
    aliases: ['ui', 'whois'],
    description: 'User information',
    usage: '[@user]',
    async execute(message, args) {
      const target = message.mentions.members.first() || message.member;
      const embed = new EmbedBuilder()
        .setTitle(target.user.tag)
        .setThumbnail(target.user.displayAvatarURL())
        .addFields(
          { name: 'ID', value: target.id, inline: true },
          { name: 'Joined Server', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Roles', value: target.roles.cache.map(r => r.name).join(', ').slice(0, 1024) || 'None' }
        )
        .setColor(target.displayHexColor)
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }
  },
  {
    name: 'roleinfo',
    description: 'Role information',
    usage: '<@role>',
    async execute(message, args) {
      const role = message.mentions.roles.first();
      if (!role) return message.reply('Mention a role');
      const embed = new EmbedBuilder()
        .setTitle(role.name)
        .setColor(role.color)
        .addFields(
          { name: 'ID', value: role.id, inline: true },
          { name: 'Color', value: role.hexColor, inline: true },
          { name: 'Members', value: role.members.size.toString(), inline: true },
          { name: 'Position', value: role.position.toString(), inline: true },
          { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
          { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true }
        );
      return message.reply({ embeds: [embed] });
    }
  },
  {
    name: 'channelinfo',
    description: 'Channel information',
    usage: '[#channel]',
    async execute(message, args) {
      const channel = message.mentions.channels.first() || message.channel;
      const embed = new EmbedBuilder()
        .setTitle(channel.name)
        .addFields(
          { name: 'ID', value: channel.id, inline: true },
          { name: 'Type', value: channel.type.toString(), inline: true },
          { name: 'Created', value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:R>`, inline: true }
        )
        .setColor('#3498db');
      return message.reply({ embeds: [embed] });
    }
  },
  {
    name: 'poll',
    description: 'Create a poll',
    usage: '<question>',
    permissions: ['ManageMessages'],
    async execute(message, args) {
      if (!args.length) return message.reply('Provide a question');
      const embed = new EmbedBuilder()
        .setTitle('📊 Poll')
        .setDescription(args.join(' '))
        .setColor('#3498db')
        .setFooter({ text: `Poll by ${message.author.tag}` });
      const msg = await message.channel.send({ embeds: [embed] });
      await msg.react('👍');
      await msg.react('👎');
      await message.delete();
    }
  },
  {
    name: 'remind',
    aliases: ['reminder'],
    description: 'Set a reminder',
    usage: '<time> <message>',
    async execute(message, args) {
      if (args.length < 2) return message.reply('Usage: `!remind 1h30m Take a break`');
      const time = args[0];
      const text = args.slice(1).join(' ');
      const ms = require('ms');
      const duration = ms(time);
      if (!duration) return message.reply('Invalid time format. Use: 1h, 30m, 1d');
      message.reply({ embeds: [CarlEmbeds.success('Reminder Set', `I'll remind you in ${time}`)] });
      setTimeout(() => {
        message.author.send(`⏰ Reminder: ${text}`).catch(() => {
          message.channel.send(`${message.author} ⏰ Reminder: ${text}`);
        });
      }, duration);
    }
  },
  {
    name: 'calc',
    description: 'Calculate math',
    usage: '<expression>',
    async execute(message, args) {
      if (!args.length) return message.reply('Provide math');
      try {
        const result = eval(args.join('').replace(/[^0-9+\-*/.()]/g, ''));
        return message.reply(`Result: **${result}**`);
      } catch {
        return message.reply('Invalid math expression');
      }
    }
  },
  {
    name: 'roll',
    description: 'Roll dice',
    usage: '[sides]',
    async execute(message, args) {
      const sides = parseInt(args[0]) || 6;
      const result = Math.floor(Math.random() * sides) + 1;
      return message.reply(`🎲 Rolled **${result}** (1-${sides})`);
    }
  },
  {
    name: 'flip',
    description: 'Flip a coin',
    async execute(message) {
      const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
      return message.reply(`🪙 **${result}**`);
    }
  },
  {
    name: 'choose',
    aliases: ['pick'],
    description: 'Choose between options',
    usage: '<option1> <option2> [option3...]',
    async execute(message, args) {
      if (args.length < 2) return message.reply('Provide at least 2 options');
      const choice = args[Math.floor(Math.random() * args.length)];
      return message.reply(`I choose: **${choice}**`);
    }
  },
  {
    name: '8ball',
    description: 'Ask the magic 8ball',
    usage: '<question>',
    async execute(message, args) {
      if (!args.length) return message.reply('Ask a question');
      const responses = ['Yes', 'No', 'Maybe', 'Definitely', 'Absolutely not', 'Ask again later', 'Most likely', 'Very doubtful'];
      return message.reply(`🎱 **${responses[Math.floor(Math.random() * responses.length)]}**`);
    }
  }
];

// Export snipes for event handler
module.exports.snipes = snipes;
