const { REST, Routes } = require('discord.js');

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity('!help | Managing servers', { type: 'WATCHING' });
  
  // Register slash commands
  const commands = [
    {
      name: 'help',
      description: 'Show all commands'
    },
    {
      name: 'ban',
      description: 'Ban a user',
      options: [{
        name: 'user',
        type: 6,
        description: 'User to ban',
        required: true
      },
      {
        name: 'reason',
        type: 3,
        description: 'Reason for ban',
        required: false
      }]
    },
    {
      name: 'kick',
      description: 'Kick a user',
      options: [{
        name: 'user',
        type: 6,
        description: 'User to kick',
        required: true
      },
      {
        name: 'reason',
        type: 3,
        description: 'Reason for kick',
        required: false
      }]
    },
    {
      name: 'purge',
      description: 'Delete messages',
      options: [{
        name: 'amount',
        type: 4,
        description: 'Number of messages (1-100)',
        required: true
      }]
    }
  ];
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash commands registered');
  } catch (error) {
    console.error(error);
  }
});
