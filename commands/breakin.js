const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const MAX_BIO_BREAKS = 2;
const MAX_LUNCH_BREAKS = 1;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('breakin')
    .setDescription('Start your break (choose: 10 min bio break or 15 min lunch/dinner break)'),
  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   * @param {import('mysql2/promise').Pool} pool
   */
  async execute(interaction, client, pool) {
    const userId = interaction.user.id;
    // Today's date (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];

    // Fetch break stats for today
    const [breakRows] = await pool.query(
      'SELECT * FROM breaks WHERE user_id = ? AND date = ?',
      [userId, today]
    );
    const breakStats = breakRows[0] || { bio_breaks: 0, lunch_breaks: 0, on_break: 0 };

    if (breakStats.on_break) {
      return interaction.reply({ content: 'You are already on a break!', ephemeral: true });
    }
    if (breakStats.lunch_breaks >= MAX_LUNCH_BREAKS && breakStats.bio_breaks >= MAX_BIO_BREAKS) {
      return interaction.reply({ content: 'You have already used both your lunch and bio break allowances for this shift.', ephemeral: true });
    }

    // Prompt for break type
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('breakin-bio')
        .setLabel('10 min Bio Break')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(breakStats.bio_breaks >= MAX_BIO_BREAKS),
      new ButtonBuilder()
        .setCustomId('breakin-lunch')
        .setLabel('15 min Lunch/Dinner Break')
        .setStyle(ButtonStyle.Success)
        .setDisabled(breakStats.lunch_breaks >= MAX_LUNCH_BREAKS)
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('😉 Choose Your Break')
          .setDescription('Select one. Each shift allows **2 bio breaks (10 min each)** and **1 lunch/dinner break (15 min)**.')
          .setColor(0xFFB7C5)
      ],
      components: [row],
      ephemeral: true
    });

    try {
      const filter = i => i.user.id === userId && (i.customId === 'breakin-bio' || i.customId === 'breakin-lunch');
      const buttonInteraction = await interaction.channel.awaitMessageComponent({
        filter,
        componentType: ComponentType.Button,
        time: 30_000,
      });

      let breakType, breakDuration, breakField;
      if (buttonInteraction.customId === 'breakin-bio') {
        breakType = 'Bio Break';
        breakDuration = 10;
        breakField = 'bio_breaks';
      } else {
        breakType = 'Lunch/Dinner Break';
        breakDuration = 15;
        breakField = 'lunch_breaks';
      }

      // Save new break stats and start time in the database
      // If no record, insert; if exists, update
      const now = new Date();
      if (breakStats && (breakStats.bio_breaks || breakStats.lunch_breaks || breakStats.on_break)) {
        // Update existing row
        await pool.query(`
          UPDATE breaks SET
            ${breakField} = ${breakField} + 1,
            on_break = 1,
            break_start = ?
          WHERE user_id = ? AND date = ?
        `, [now, userId, today]);
      } else {
        // Insert new row
        await pool.query(`
          INSERT INTO breaks (user_id, date, bio_breaks, lunch_breaks, on_break, break_start)
          VALUES (?, ?, ?, ?, 1, ?)
        `, [
          userId,
          today,
          breakField === 'bio_breaks' ? 1 : 0,
          breakField === 'lunch_breaks' ? 1 : 0,
          now
        ]);
      }

      // Set timers (in-memory, lost on restart; for cloud reliability, use a persistent queue)
      setTimeout(() => {
        interaction.channel.send(`<@${userId}> You have 2 minutes left on your ${breakType.toLowerCase()}!`);
      }, (breakDuration - 2) * 60 * 1000);
      setTimeout(async () => {
        await pool.query(
          'UPDATE breaks SET on_break = 0 WHERE user_id = ? AND date = ?',
          [userId, today]
        );
        interaction.channel.send(`<@${userId}> Your ${breakDuration}-minute ${breakType.toLowerCase()} is over! Please return.`);
      }, breakDuration * 60 * 1000);

      await buttonInteraction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle('🟠 Break Started')
            .setDescription(`Your ${breakType.toLowerCase()} has started. You have up to ${breakDuration} minutes.`)
            .setColor(0xFFB7C5)
        ],
        components: []
      });

    } catch (err) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('No break selected')
            .setDescription('You did not select a break in time.')
            .setColor(0xff0000)
        ],
        components: []
      });
    }
  }
};