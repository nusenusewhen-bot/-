const { AutoRole } = require('../models');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const autoRole = await AutoRole.findOne({ where: { guildId: member.guild.id } });
    if (!autoRole) return;
    
    const role = member.guild.roles.cache.get(autoRole.roleId);
    if (!role) return;
    
    if (autoRole.delay > 0) {
      setTimeout(() => {
        member.roles.add(role).catch(() => {});
      }, autoRole.delay * 60000);
    } else {
      member.roles.add(role).catch(() => {});
    }
  }
};
