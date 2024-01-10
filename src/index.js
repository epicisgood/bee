import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { Client, Routes, SlashCommandBuilder, ChannelType } from 'discord.js';
import { REST } from '@discordjs/rest';
import schedule from 'node-schedule';
import fs from 'fs/promises';

config();

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = '1100867342461833228';

const client = new Client({ intents: [] });
const rest = new REST({ version: '10' }).setToken(TOKEN);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const remindersFilePath = join(__dirname, 'reminders.json');

let reminders = [];

try {
    const data = await fs.readFile(remindersFilePath, 'utf-8');
    if (data.trim() !== '') {
        reminders = JSON.parse(data);
    }
} catch (error) {
    if (error.code === 'ENOENT') {
        await fs.writeFile(remindersFilePath, '[]', 'utf-8');
    } else {
        console.error('Error loading reminders:', error);
    }
}

// Define slash commands
const BssRemoverCommand = new SlashCommandBuilder()
    .setName('bssremover') // Change the name to lowercase
    .setDescription('Remove a specific reminder')
    .addIntegerOption((option) =>
        option
            .setName('index')
            .setDescription('Index of the reminder to remove')
            .setRequired(true)
    )
    .toJSON();


const bsslistCommand = new SlashCommandBuilder()
    .setName('bsslist')
    .setDescription('List all active reminders')
    .toJSON();

const bssCommand = new SlashCommandBuilder()
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
                { name: 'Testing', value: 3600 }
            )
            .setRequired(true)
    )
    .addChannelOption((option) =>
        option
            .setName('channel')
            .setDescription('The channel the message should be sent to')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
    )
    .toJSON();

const commands = [BssRemoverCommand, bsslistCommand, bssCommand];

// Function to check and execute reminders on bot startup
async function checkReminders() {
    for (let i = 0; i < reminders.length; i++) {
        const reminder = reminders[i];

        if (reminder.scheduledTime <= Math.floor(Date.now() / 1000)) {
            const user = await client.users.fetch(reminder.user);
            const channel = await client.channels.fetch(reminder.channel);

            try {
                await channel.send({ content: reminder.message });
            } catch (error) {
                console.error('Error sending scheduled message:', error);
            }

            // Remove the processed reminder from the array
            reminders.splice(i, 1);
            i--; // Adjust index to account for the removed element

            await saveReminders();
        }
    }
}

// Function to save reminders to the file
async function saveReminders() {
    try {
        await fs.writeFile(remindersFilePath, JSON.stringify(reminders, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving reminders:', error);
    }
}

// Register commands with Discord API
async function registerCommands() {
    try {
        // Register guild-specific commands
        await rest.put(Routes.applicationCommands(CLIENT_ID), {
            body: commands,
        });
        

        console.log('Commands registered successfully!');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// Event handler for new commands
client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) {
        switch (interaction.commandName) {
            case 'bssremover':
                try {
                    const indexToRemove = interaction.options.getInteger('index');

                    if (indexToRemove >= 0 && indexToRemove < reminders.length) {
                        const removedReminder = reminders.splice(indexToRemove, 1)[0];
                        await saveReminders();

                        await interaction.reply({
                            content: `Removed the following reminder:\n${JSON.stringify(removedReminder, null, 2)}`,
                            ephemeral: true,
                        });
                    } else {
                        await interaction.reply({
                            content: 'Invalid index. Please provide a valid index of the reminder to remove.',
                            ephemeral: true,
                        });
                    }
                } catch (error) {
                    console.error('Error handling bssremover command:', error);
                    await interaction.reply({
                        content: 'An error occurred while processing the command.',
                        ephemeral: true,
                    });
                }
                break;

            case 'bsslist':
                try {
                    const reminderList = reminders.map((reminder) => ({
                        user: reminder.user,
                        channel: reminder.channel,
                        message: reminder.message,
                        scheduledTime: `<t:${reminder.scheduledTime}:R> <t:${reminder.scheduledTime}:T>`,
                    }));

                    // Split the reminderList into chunks of 10 reminders for better readability
                    const chunks = [];
                    for (let i = 0; i < reminderList.length; i += 10) {
                        chunks.push(reminderList.slice(i, i + 10));
                    }

                    // Send each chunk as a separate message
                    for (const chunk of chunks) {
                        await interaction.reply({
                            content: `**Active Reminders:**\n${JSON.stringify(chunk, null, 2)}`,
                            ephemeral: true,
                        });
                    }
                } catch (error) {
                    console.error('Error handling Bsslist command:', error);
                    await interaction.reply({
                        content: 'An error occurred while processing the command.',
                        ephemeral: true,
                    });
                }
                break;

            case 'bss':
                try {
                    const time = interaction.options.getInteger('reminder');
                    const selectedChannel = interaction.options.getChannel('channel');
                    const channel = selectedChannel ? selectedChannel.id : interaction.channel?.id;
                    const user = interaction.user;

                    function getmessage(optionMessage) {
                        switch (optionMessage) {
                            case 79200000:
                                return 'Claim your robo pass rn';
                            case 79200001:
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

                    function getremindertype(optiontype) {
                        switch (optiontype) {
                            case 79200000:
                                return 'Robo pass';
                            case 79200001:
                                return 'Glue Dispenser';
                            case 86400000:
                                return 'King Beetle';
                            case 172800000:
                                return 'Tunnel Bear';
                            case 129600000:
                                return 'Coconut Crab';
                            default:
                                return 'Unknown reminder';
                        }
                    }

                    const returnmessage = getmessage(time);
                    const remindertype = getremindertype(time);
                    const scheduledDate = new Date(new Date().getTime() + time);
                    const epochTime = Math.floor(scheduledDate.getTime() / 1000);

                    reminders.push({
                        user: user.id,
                        channel: channel,
                        message: `${returnmessage} ${user}`,
                        scheduledTime: epochTime,
                    });

                    await saveReminders();

                    await interaction.reply({
                        content: `Reminder will mention ${user} for ${remindertype} <t:${epochTime}:R> <t:${epochTime}:T>`,
                        ephemeral: true,
                    });

                    schedule.scheduleJob(scheduledDate, async () => {
                        try {
                            if (channel) {
                                const channelObject = client.channels.cache.get(channel);
                                if (channelObject) {
                                    await channelObject.send({ content: `${returnmessage} ${user}` });
                                } else {
                                    console.error(`Channel ${channel} not found.`);
                                }
                            }
                        } catch (error) {
                            console.error('Error sending scheduled message:', error);
                        }
                    });
                } catch (error) {
                    console.error('Error handling bss command:', error);
                    await interaction.reply({
                        content: 'An error occurred while processing the command.',
                        ephemeral: true,
                    });
                }
                break;
        }
    }
});

// Register commands on bot startup
registerCommands();

// Start the bot
client.login(TOKEN);
