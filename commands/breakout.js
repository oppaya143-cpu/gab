const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const MAX_BREAK_MINUTES = 15;
const MAX_BIO_BREAK_MINUTES = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('breakout')
    .setDescription('Return from your break'),
  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   * @param {import('mysql2/promise').Pool} pool
   */
  async execute(interaction, client, pool) {
    const userId = interaction.user.id;
    const member = interaction.member;
    // Prefer nickname, fallback to username
    const displayName = member?.nickname || interaction.user.username;
    const today = new Date().toISOString().split('T')[0];

    // Get today's break record
    const [breakRows] = await pool.query(
      'SELECT * FROM breaks WHERE user_id = ? AND date = ?',
      [userId, today]
    );
    const breakStats = breakRows[0];

    if (!breakStats || !breakStats.on_break || !breakStats.break_start) {
      return interaction.reply({ content: 'You are not currently on a break.', ephemeral: true });
    }

    // Find the active session in break_sessions (no break_end set)
    const [sessionRows] = await pool.query(
      'SELECT * FROM break_sessions WHERE user_id = ? AND date = ? AND break_start = ? AND break_end IS NULL ORDER BY id DESC LIMIT 1',
      [userId, today, breakStats.break_start]
    );
    const session = sessionRows[0];

    const now = new Date();
    const breakStart = new Date(breakStats.break_start);
    const breakDuration = Math.floor((now - breakStart) / 60000); // in minutes

    // Update total_break_minutes in breaks
    const totalBreak = (breakStats.total_break_minutes || 0) + breakDuration;
    await pool.query(
      'UPDATE breaks SET on_break = 0, break_start = NULL, total_break_minutes = ? WHERE user_id = ? AND date = ?',
      [totalBreak, userId, today]
    );

    // Mark session as ended
    let breakType = "Break";
    if (session) {
      breakType = session.break_type || "Break";
      await pool.query(
        'UPDATE break_sessions SET break_end = ?, duration_minutes = ? WHERE id = ?',
        [now, breakDuration, session.id]
      );
    }

    let warning = "";
    let embedColor = 0xFFD1DC; // Default: pink

    if (/bio/i.test(breakType)) {
      if (breakDuration > MAX_BIO_BREAK_MINUTES) {
        warning = ` ⚠️ <@${userId}> (${displayName}), you have exceeded your 10-minute allowance for this bio break!`;
        embedColor = 0xFF0000; // Red
      }
    } else if (/lunch|dinner/i.test(breakType)) {
      if (breakDuration > MAX_BREAK_MINUTES) {
        warning = ` ⚠️ <@${userId}> (${displayName}), you have exceeded your 15-minute allowance for this lunch/dinner break!`;
        embedColor = 0xFF0000; // Red
      }
    }

    let msg = `You ended your **${breakType}** after ${breakDuration} minute${breakDuration === 1 ? '' : 's'}.${warning}`;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🟢 Back from Break')
          .setDescription(msg)
          .setColor(embedColor)
      ]
    });
  }
};