const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  client.commands = new Collection();
  client.aliases = new Collection();
  
  const commandsPath = path.join(__dirname, '../commands');
  
  const loadCommand = (filePath) => {
    const command = require(filePath);
    if (command.name) {
      client.commands.set(command.name, command);
      if (command.aliases) {
        command.aliases.forEach(alias => client.aliases.set(alias, command.name));
      }
    }
  };

  // Recursively load commands
  const readCommands = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        readCommands(filePath);
      } else if (file.endsWith('.js')) {
        loadCommand(filePath);
      }
    }
  };

  readCommands(commandsPath);
  console.log(`Loaded ${client.commands.size} commands`);
};
