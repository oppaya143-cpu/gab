const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatLondonTime } = require('../utils/format-time');

// Make sure this matches your /clockin shifts table
const shifts = {
  peak: { name: 'Peak', time: '12AM UTC' },
  morning: { name: 'Morning', time: '8AM UTC' },
  afternoon: { name: 'Afternoon', time: '4PM UTC' },
};

const statuses = [
  '✅ Done for today!', '🎯 Great shift!', '🏆 All wrapped up!', '🌟 Time to rest!',
  '🎉 Another one done!', '🚀 See you next time!', '✨ Signing off!', '💼 Task complete!',
  '🎭 The curtain falls!', '🌍 Good job today!', '🎶 Harmony achieved!', '⚡ Powering down!',
  '🌈 Success unlocked!', '📈 Another step forward!', '🎉 That’s a wrap!', '🌟 Taking a bow!',
  '🚀 Another milestone reached!', '✨ Clocking out in style!', '🎯 Goals accomplished!',
  '💪 Mission complete!', '🎭 Performance over!', '🌍 Making waves!', '🎨 Creativity paused!',
  '🎶 Melody complete!', '⚡ Battery recharged!', '🌟 Ready for tomorrow!', '📈 Leveling up completed!',
  '🎉 Finished with pride!', '🚀 Aiming higher next time!', '✨ Time to relax!',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clockout')
    .setDescription('Clock out of your shift.'),
  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   * @param {import('mysql2/promise').Pool} pool
   */
  async execute(interaction, client, pool) {
    const userId = interaction.user.id;
    const displayName = interaction.member?.displayName || interaction.user.username;

    // Get the latest clock-in for this user
    const [clockinRows] = await pool.query(
      'SELECT * FROM clockins WHERE user_id = ? ORDER BY clock_in_time DESC LIMIT 1',
      [userId]
    );
    const lastClockIn = clockinRows[0];

    // Also fetch user info for model (from members table)
    const [userRows] = await pool.query('SELECT * FROM members WHERE id = ?', [userId]);
    const user = userRows[0];

    if (!lastClockIn || !user || !user.model) {
      await interaction.reply({
        content: 'You need to clock in first before clocking out!',
        ephemeral: true,
      });
      return;
    }

    // Insert clock-out record in a clockouts table (keeps full history; adjust schema as needed!)
    const clockOutTime = new Date();
    await pool.query(
      'INSERT INTO clockouts (user_id, clock_out_time, shift, model, clock_in_time) VALUES (?, ?, ?, ?, ?)',
      [userId, clockOutTime, lastClockIn.shift, user.model, lastClockIn.clock_in_time]
    );

    // Prepare embed
    const shift = shifts?.[lastClockIn.shift] || { name: lastClockIn.shift, time: '' };
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    const embed = new EmbedBuilder()
      .setColor(0x2F3136)
      .setTitle('⚫ CLOCK OUT')
      .addFields(
        { name: '🕒 Time:', value: formatLondonTime(clockOutTime), inline: false },
        { name: '👤 Chatter:', value: displayName, inline: false },
        { name: '💖 Model:', value: `***${user.model}***`, inline: false },
        { name: '💼 Shift:', value: `${shift.name} (${shift.time})`, inline: false },
        { name: 'Status:', value: `_${randomStatus}_`, inline: false }
      );

    await interaction.reply({ embeds: [embed] });
  },
  shifts
};