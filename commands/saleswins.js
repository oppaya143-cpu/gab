const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('saleswins')
    .setDescription('Post a Sales Win with picture, date, and your model from chatterData.json'),
  async execute(interaction) {
    const author = interaction.user;
    const authorId = author.id;

    // FIX: Use process.cwd() for absolute path
    const chatterDataPath = path.join(process.cwd(), 'chatterData.json');
    let chatterData;
    try {
      console.log('Looking for chatterData.json at:', chatterDataPath); // For debugging
      chatterData = JSON.parse(fs.readFileSync(chatterDataPath, 'utf8'));
    } catch (err) {
      return interaction.reply({ content: 'Could not load chatter data.', ephemeral: true });
    }

    const userInfo = chatterData[authorId];
    if (!userInfo || !userInfo.model) {
      return interaction.reply({ content: 'No model info found for you in the system.', ephemeral: true });
    }

    const now = new Date();
    const dateString = now.toISOString().split('T')[0];

    const filePath = path.join(process.cwd(), 'images', 'Sales Wins.jpg');
    const attachment = new AttachmentBuilder(filePath);

    const caption = `**Sales Win!** 🎉\n**Date:** ${dateString} UTC\n**Model:** ${userInfo.model}\n**Chatter:** <@${authorId}>`;

    await interaction.reply({
      content: caption,
      files: [attachment],
    });
  },
};