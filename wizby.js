const db = require('./db');
const fs = require('fs');
const path = require('path');
require('child_process').execSync('node deploy-commands.js', { stdio: 'inherit' });

require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { handleCommands } = require('./handlers/commandHandler');
const config = require('./config.json');
const mysql = require('mysql2/promise');

const requiredFolders = [
  path.resolve(__dirname, 'commands'),
  path.resolve(__dirname, 'triggers'),
  path.resolve(__dirname, 'triggers/message'),
  path.resolve(__dirname, 'triggers/reaction'),
  path.resolve(__dirname, 'triggers/schedule'),
  path.resolve(__dirname, 'triggers/database'),
  path.resolve(__dirname, 'triggers/interaction'),
  path.resolve(__dirname, 'triggers/guild'),
  path.resolve(__dirname, 'handlers'),
];
for (const folder of requiredFolders) {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    console.log(`Created folder: ${folder}`);
  }
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '157.90.211.250',
  user: process.env.MYSQL_USER || 'u1719_Xqd8JtPVuY',
  password: process.env.MYSQL_PASS || '^HjmILUhFjnX1=KTL9A9+5Bb',
  database: process.env.MYSQL_DB || 's1719_WIZby_universal',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function cleanOldCache() {
  try {
    await pool.query("DELETE FROM cache WHERE created_at < NOW() - INTERVAL 1 DAY");
    console.log(`[${new Date().toISOString()}] Cache table cleaned (older than 24h deleted)`);
  } catch (err) {
    console.error('Error cleaning cache:', err);
  }
}
setInterval(cleanOldCache, 24 * 60 * 60 * 1000);
cleanOldCache(); 

const TOKEN = process.env.DISCORD_TOKEN || config.token;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});
client.commands = new Collection();

handleCommands(client, path.resolve(__dirname, 'commands'));


client.once('ready', () => {
  console.log(`${client.user.tag} is online and ready!`);
});


client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction, client, pool);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
  }
});

const triggerTypes = ['message', 'reaction', 'schedule', 'database', 'interaction', 'guild'];
for (const type of triggerTypes) {
  const triggerPath = path.resolve(__dirname, 'triggers', type);
  if (fs.existsSync(triggerPath)) {
    fs.readdirSync(triggerPath).forEach(file => {
      if (file.endsWith('.js')) {
        const trigger = require(path.join(triggerPath, file));
        if (typeof trigger === 'function') {
          trigger(client, pool, db, bucket);
          console.log(`Loaded ${type} trigger: ${file}`);
        }
      }
    });
  }
}

module.exports = {
  client,
  pool,
  db
};

// --- Start Bot ---
client.login(TOKEN);