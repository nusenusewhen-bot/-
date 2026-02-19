module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;
    
    const { commandName } = interaction;
    
    if (commandName === 'help') {
      await interaction.reply('Type `!help` for commands or use slash commands: /ban, /kick, /purge');
    }
    else if (commandName === 'ban') {
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason';
      if (!target) return interaction.reply('User not found');
      await target.send(`You were banned from ${interaction.guild.name} | ${reason}`).catch(() => {});
      await target.ban({ reason });
      await interaction.reply(`Banned ${target.user.tag}`);
    }
    else if (commandName === 'kick') {
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason';
      if (!target) return interaction.reply('User not found');
      await target.send(`You were kicked from ${interaction.guild.name} | ${reason}`).catch(() => {});
      await target.kick(reason);
      await interaction.reply(`Kicked ${target.user.tag}`);
    }
    else if (commandName === 'purge') {
      const amount = interaction.options.getInteger('amount');
      if (amount < 1 || amount > 100) return interaction.reply('Provide 1-100');
      await interaction.channel.bulkDelete(amount);
      await interaction.reply({ content: `Deleted ${amount} messages`, ephemeral: true });
    }
  }
};
