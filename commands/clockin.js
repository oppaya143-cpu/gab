const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatLondonTime } = require('../utils/format-time');

const shifts = {
  peak: { name: 'Peak', time: '12AM UTC' },
  morning: { name: 'Morning', time: '8AM UTC' },
  afternoon: { name: 'Afternoon', time: '4PM UTC' },
};

const statuses = [
  '🎉 Let’s do this!', '✨ Ready to shine!', '🚀 All set!', '🌟 Let’s go!', '🔥 Clocked in!',
  '⚡ Fully charged!', '🎯 Focused and ready!', '💪 Bringing my A-game!', '🎶 Let’s make some noise!',
  '🏆 On the path to greatness!', '🎨 Time to create magic!', '🛠️ Building something awesome!',
  '📈 Let’s level up!', '🌈 Feeling unstoppable!', '🎉 Clocked in and motivated!',
  '🌟 Time to make it happen!', '🚀 Full throttle ahead!', '✨ Ready to conquer!',
  '🎯 Locked and loaded!', '💼 Ready for action!', '🎭 Putting on my best show!',
  '🌍 Let’s change the world!', '🎨 Creativity unlocked!', '🎶 Making harmony happen!',
  '⚡ Energy at 100%!', '🌟 Aiming for the stars!', '📈 Set for success!',
  '🎉 Ready to shine bright!', '🚀 Breaking barriers!', '✨ Let’s make today count!'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clockin')
    .setDescription('Clock in for your shift!'),
  
  async execute(interaction, client, pool) {
    const userId = interaction.user.id;
    const displayName = interaction.member?.displayName || interaction.user.username;

    // Fetch user info from the database
    const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [userId]);
    const user = rows[0];

    if (!user || !user.model || !user.shift) {
      await interaction.reply({
        content: 'Please set up your model and shift first using /setupclock.',
        ephemeral: true
      });
      return;
    }

    // Record the clock-in to a clockins table (does not overwrite)
    const clockInTime = new Date();
    await pool.query(
      'INSERT INTO clockins (user_id, clock_in_time, shift, model) VALUES (?, ?, ?, ?)',
      [userId, clockInTime, user.shift, user.model]
    );

    // Prepare embed with info
    const shift = shifts[user.shift] || { name: user.shift, time: '' };
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    const embed = new EmbedBuilder()
      .setColor(0x1f8b4c)
      .setTitle('🟢 CLOCK IN')
      .addFields(
        { name: '🕒 Time:', value: formatLondonTime(clockInTime), inline: false },
        { name: '👤 Chatter:', value: displayName, inline: false },
        { name: '💖 Model:', value: `***${user.model}***`, inline: false },
        { name: '💼 Shift:', value: `${shift.name} (${shift.time})`, inline: false },
        { name: 'Status:', value: `_${randomStatus}_`, inline: false }
      );

    await interaction.reply({ embeds: [embed] });
  },
  shifts
};