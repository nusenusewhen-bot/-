const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  client.commands = new Collection();
  client.aliases = new Collection();
  
  const commandsPath = path.join(__dirname, '../commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commands = require(filePath);
    
    // Handle both single command and array of commands
    const commandArray = Array.isArray(commands) ? commands : [commands];
    
    for (const command of commandArray) {
      if (command.name) {
        client.commands.set(command.name, command);
        if (command.aliases) {
          command.aliases.forEach(alias => client.aliases.set(alias, command.name));
        }
      }
    }
  }
  
  console.log(`Loaded ${client.commands.size} commands`);
};
