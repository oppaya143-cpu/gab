const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon'); // Luxon for time conversion

// Database connection details
const dbConfig = {
  host: '157.90.211.250',
  user: 'u1719_Xqd8JtPVuY',
  password: '^HjmILUhFjnX1=KTL9A9+5Bb',
  database: 's1719_WIZby_universal',
};

// Folder to store user-specific JSON files
const usersFolder = path.resolve(__dirname, '../Wizby/Users');

// Ensure the folder exists
if (!fs.existsSync(usersFolder)) {
  fs.mkdirSync(usersFolder, { recursive: true });
  console.log(`Created folder: ${usersFolder}`);
}

// Helper to read user data from a JSON file
const readUserData = (userId) => {
  const filePath = path.join(usersFolder, `${userId}.json`);
  if (!fs.existsSync(filePath)) {
    return null; // Return null if the file doesn't exist
  }
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

// Helper to write user data to a JSON file without overwriting existing clock-in/out or break data
const writeUserData = async (userId, newData) => {
  const filePath = path.join(usersFolder, `${userId}.json`);
  let existingData = readUserData(userId);

  if (!existingData) {
    existingData = {
      model: '',
      shift: '',
      clockInHistory: [],
      clockOutHistory: [],
      breakStart: null,
      breakType: null, // e.g., "Lunch", "Dinner", etc.
      onBreak: false,
      totalBreak: 0,
    };
  }

  // Merge the new data with the existing data (preserve clock-in/out and break data)
  const mergedData = {
    ...existingData,
    ...newData,
    clockInHistory: existingData.clockInHistory, // Preserve clock-ins
    clockOutHistory: existingData.clockOutHistory, // Preserve clock-outs
    breakStart: existingData.breakStart, // Keep break start intact
    breakType: existingData.breakType, // Keep break type intact
    onBreak: existingData.onBreak, // Keep onBreak status intact
    totalBreak: existingData.totalBreak, // Keep total break time intact
  };

  fs.writeFileSync(filePath, JSON.stringify(mergedData, null, 2), 'utf-8');

  // ALSO ADD TO DATABASE s1719_WIZby_universal
  await updateDatabase(userId, mergedData);
};

// Function to update the database s1719_WIZby_universal
const updateDatabase = async (userId, data) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    const query = `
      INSERT INTO user_data (user_id, model, shift, clock_in_history, clock_out_history, break_start, break_type, on_break, total_break)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        model = VALUES(model),
        shift = VALUES(shift),
        clock_in_history = VALUES(clock_in_history),
        clock_out_history = VALUES(clock_out_history),
        break_start = VALUES(break_start),
        break_type = VALUES(break_type),
        on_break = VALUES(on_break),
        total_break = VALUES(total_break)
    `;

    const params = [
      userId,
      data.model,
      data.shift,
      JSON.stringify(data.clockInHistory),
      JSON.stringify(data.clockOutHistory),
      data.breakStart,
      data.breakType,
      data.onBreak,
      data.totalBreak,
    ];

    await connection.execute(query, params);
    await connection.end();
    console.log(`Database updated for user ${userId}`);
  } catch (err) {
    console.error(`Failed to update database for user ${userId}:`, err.message);
  }
};

// Shift options for the buttons (including "Others")
const shiftOptions = [
  { id: 'peak', label: '🌖ᴘᴇᴀᴋ🌕', style: ButtonStyle.Secondary },
  { id: 'morning', label: '🌔ᴍᴏʀɴɪɴɢ🌒', style: ButtonStyle.Secondary },
  { id: 'afternoon', label: '🌑ᴀꜰᴛᴇʀɴᴏᴏɴ🌘', style: ButtonStyle.Secondary },
  { id: 'others', label: '✨ᴏᴛʜᴇʀꜱ✨', style: ButtonStyle.Secondary }, // "Others" button added
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupclock')
    .setDescription('ꜱᴇᴛ ᴜᴘ ʏᴏᴜʀ ᴍᴏᴅᴇʟ ᴀɴᴅ ꜱʜɪꜰᴛ ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ')
    .addStringOption(option =>
      option.setName('model').setDescription('ᴍᴏᴅᴇʟ 1 / ᴍᴏᴅᴇʟ 2 ᴏʀ ᴍᴏᴅᴇʟ 1, ᴍᴏᴅᴇʟ 2').setRequired(true)
    ),
  async execute(interaction) {
    const userId = interaction.user.id;
    const model = interaction.options.getString('model');

    // Pre-message explaining how to input models
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffc0cb) // Light pink
          .setTitle('ᴍᴏᴅᴇʟ ɪɴᴘᴜᴛ ɪɴꜱᴛʀᴜᴄᴛɪᴏɴꜱ')
          .setDescription('ᴘʟᴇᴀꜱᴇ ꜱᴇᴘᴀʀᴀᴛᴇ ᴍᴜʟᴛɪᴘʟᴇ ᴍᴏᴅᴇʟꜱ ᴏʀ ᴀᴄᴄᴏᴜɴᴛꜱ ᴜꜱɪɴɢ **ꜱʟᴀꜱʜ ( / )** ᴏʀ **ᴄᴏᴍᴍᴀ ( , )**.')
          .setFooter({ text: 'ᴇxᴀᴍᴘʟᴇ: ᴍᴏᴅᴇʟ 1 / ᴍᴏᴅᴇʟ 2' })
      ],
      ephemeral: true,
    });

    // Check if the user separated models properly
    if (!model.includes('/') && !model.includes(',')) {
      await interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb6c1) // Pale pink
            .setTitle('ᴏɴʟʏ ᴏɴᴇ ᴀᴄᴄᴏᴜɴᴛ?')
            .setDescription('ʏᴏᴜ ᴅɪᴅ ɴᴏᴛ ꜱᴇᴘᴀʀᴀᴛᴇ ᴍᴏᴅᴇʟꜱ. ᴀʀᴇ ʏᴏᴜ ᴏɴʟʏ ʜᴀɴᴅʟɪɴɢ ᴏɴᴇ ᴀᴄᴄᴏᴜɴᴛ? ʀᴇꜱᴜʙᴍɪᴛ ɪꜰ ᴍᴜʟᴛɪᴘʟᴇ.')
        ],
        ephemeral: true,
      });
    }

    // Ask for shift via buttons
    const row = new ActionRowBuilder().addComponents(
      shiftOptions.map(opt =>
        new ButtonBuilder()
          .setCustomId(`setupclock-shift-${opt.id}`)
          .setLabel(opt.label)
          .setStyle(opt.style)
      )
    );

    await interaction.followUp({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff69b4) // Hot pink
          .setTitle('ꜱᴇʟᴇᴄᴛ ᴀ ꜱʜɪꜰᴛ')
          .setDescription('ᴘʟᴇᴀꜱᴇ ꜱᴇʟᴇᴄᴛ ʏᴏᴜʀ ꜱʜɪꜰᴛ:')
      ],
      components: [row],
      ephemeral: true,
    });

    const filter = i =>
      i.user.id === userId &&
      i.customId.startsWith('setupclock-shift-');

    try {
      const buttonInteraction = await interaction.channel.awaitMessageComponent({
        filter,
        componentType: ComponentType.Button,
        time: 30_000,
      });

      const shift = buttonInteraction.customId.replace('setupclock-shift-', '');

      // Update user data file
      await writeUserData(userId, {
        model,
        shift,
      });

      // Fetch user nickname from Guild 2
      const guild2 = interaction.client.guilds.cache.get('1364081601776189481');
      const member = guild2?.members.cache.get(userId);
      const nickname = member?.nickname || interaction.user.username;

      // Send update to Guild 1
      const guild1 = interaction.client.guilds.cache.get('1362961824622051432');
      const channel = guild1?.channels.cache.get('1366708121560416296');
      if (channel?.isTextBased()) {
        const thread = await channel.threads.create({
          name: `#setupclock WIZBY~`,
          autoArchiveDuration: 60, // Auto-archive after 60 minutes
          reason: 'User updated their setup clock data.',
        });

        await thread.send({
          content: `**ᴜᴘᴅᴀᴛᴇᴅ ꜱᴇᴛᴜᴘ ᴄʟᴏᴄᴋ**\n\n**ᴜꜱᴇʀ ɴɪᴄᴋɴᴀᴍᴇ:** ${nickname}\n**ᴜꜱᴇʀ ɪᴅ:** ${userId}\n**ᴍᴏᴅᴇʟ:** ${model}\n**ꜱʜɪꜰᴛ:** ${shift}`,
        });
      }

      await buttonInteraction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb6c1) // Pale pink
            .setTitle('ꜱᴇᴛᴜᴘ ᴄᴏᴍᴘʟᴇᴛᴇ')
            .setDescription(`**ᴍᴏᴅᴇʟ:** ${model}\n**ꜱʜɪꜰᴛ:** ${shift}`)
        ],
        components: [],
        ephemeral: true,
      });
    } catch (err) {
      await interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff69b4) // Hot pink
            .setTitle('ɴᴏ ꜱᴇʟᴇᴄᴛɪᴏɴ ᴍᴀᴅᴇ')
            .setDescription('ʏᴏᴜ ᴅɪᴅ ɴᴏᴛ ꜱᴇʟᴇᴄᴛ ᴀ ꜱʜɪꜰᴛ ɪɴ ᴛɪᴍᴇ.')
        ],
        ephemeral: true,
      });
    }
  }
};