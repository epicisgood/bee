import { config } from 'dotenv';
config();
import { Client, Routes, SlashCommandBuilder, ChannelType } from 'discord.js';
import { REST } from '@discordjs/rest';
import schedule from 'node-schedule';

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = '1100867342461833228';

const client = new Client({ intents: [] });
const rest = new REST({ version: '10' }).setToken(TOKEN);

const commands = [
  new SlashCommandBuilder()
    .setName('bss')
    .setDescription('Sets a bss reminder')
    .addIntegerOption((option) =>
      option
        .setName('reminder')
        .setDescription('What do you want to be reminded of?')
        .setChoices(
          { name: 'Robo pass', value: 79200000 },
          { name: 'Glue', value: 79200001 },
          { name: 'King beetle', value: 86400000 },
          { name: 'Coconut Crab', value: 129600000 },
          { name: 'Tunnel Bear', value: 172800000 },
          { name: '1 hour', value: 3600000 }
        )
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The channel the message should be sent to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .toJSON(),
];

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'bss') {
      try {
        const time = interaction.options.getInteger('reminder');
        const channel = interaction.options.getChannel('channel');

        function getmessage(optionMessage) {
          switch (optionMessage) {
            case 79200000:
              return 'Claim your robo pass rn';
            case 79200001: // Glue dispenser has a different value
              return 'Check the Glue Dispenser now';
            case 86400000:
              return 'Prepare for King Beetle';
            case 172800000:
              return 'Tunnel Bear is coming!';
            case 129600000:
              return 'Get ready for Coconut Crab';
            default:
              return 'Unknown reminder';
          }
        }

        const returnmessage = getmessage(time);

        const scheduledDate = new Date(new Date().getTime() + time);
        const epochTime = Math.floor(scheduledDate.getTime() / 1000); // Convert milliseconds to seconds
        await interaction.reply({
          content: `Your message will send <t:${epochTime}:R> <t:${epochTime}:T>`,
          ephemeral: true,
        });
        console.log(scheduledDate);
        schedule.scheduleJob(scheduledDate, async (fireDate) => {
          try {
            await channel.send({ content: `${returnmessage}` });
          } catch (error) {
            console.error('Error sending scheduled message:', error);
          }
        });
      } catch (error) {
        console.error('Error handling interaction:', error);
        await interaction.reply({
          content: 'An error occurred while processing your command.',
          ephemeral: true,
        });
      }
    }
  }
});

async function main() {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });
    client.login(TOKEN);
  } catch (err) {
    console.log(err);
  }
}

main();
