require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config.json');

// List your two guild IDs here
const GUILD_IDS = [
  "1364081601776189481", // Wizby Universal
  "1362961824622051432" // Testing 
];

// Load all command files
function loadCommands(dir) {
  let commands = [];
  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      commands = commands.concat(loadCommands(fullPath));
    } else if (file.name.endsWith('.js')) {
      const cmd = require(fullPath);
      if (cmd.data) commands.push(cmd.data.toJSON());
    }
  }
  return commands;
}

const commands = loadCommands(path.resolve(__dirname, 'commands'));
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN || config.token);
const CLIENT_ID = process.env.CLIENT_ID || config.clientId;

async function deleteGlobalCommands() {
  const globalCommands = await rest.get(Routes.applicationCommands(CLIENT_ID));
  for (const cmd of globalCommands) {
    await rest.delete(Routes.applicationCommand(CLIENT_ID, cmd.id));
    console.log(`Deleted global command: ${cmd.name}`);
  }
}

async function deleteGuildCommands(guildId) {
  const guildCommands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, guildId));
  for (const cmd of guildCommands) {
    await rest.delete(Routes.applicationGuildCommand(CLIENT_ID, guildId, cmd.id));
    console.log(`Deleted command: ${cmd.name} from guild ${guildId}`);
  }
}

(async () => {
  try {
    if (!CLIENT_ID) throw new Error('CLIENT_ID is required!');
    // 1. Delete all global commands
    console.log('Deleting all global commands...');
    await deleteGlobalCommands();

    // 2. Delete all commands from each guild
    for (const GUILD_ID of GUILD_IDS) {
      if (!GUILD_ID) throw new Error('GUILD_ID is required!');
      console.log(`Deleting all commands from guild ${GUILD_ID}...`);
      await deleteGuildCommands(GUILD_ID);
    }

    // 3. Deploy commands to only your two guilds
    for (const GUILD_ID of GUILD_IDS) {
      console.log(`Deploying commands to guild ${GUILD_ID}...`);
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands },
      );
      console.log(`Successfully deployed commands to guild ${GUILD_ID}.`);
    }
    console.log('Clean deploy complete! Commands exist only in your two guilds.');
  } catch (error) {
    console.error(error);
  }
})();