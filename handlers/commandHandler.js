const fs = require('fs');
const path = require('path');

function loadCommands(dir) {
  const commands = [];
  if (!fs.existsSync(dir)) return commands;
  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      commands.push(...loadCommands(fullPath));
    } else if (file.name.endsWith('.js')) {
      const cmd = require(fullPath);
      if (cmd.data && cmd.data.name) commands.push(cmd);
    }
  }
  return commands;
}

function handleCommands(client, dir) {
  const commands = loadCommands(dir);
  for (const cmd of commands) client.commands.set(cmd.data.name, cmd);
}

module.exports = { handleCommands, loadCommands };