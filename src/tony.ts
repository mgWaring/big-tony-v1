if (process.env.ENV !== 'production') {
    require('dotenv').config();
}
import fs from 'fs';
import path from 'path';
import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import winston from 'winston';
import { tonyConfig } from './config/config';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'tony-recall' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'general.log' }),
    ],
});

console.log(tonyConfig)

if (!tonyConfig.token) throw new Error("No discord token!")

const bot = new Client({ intents: [GatewayIntentBits.Guilds] })
bot.once(Events.ClientReady, (readyClient) => {
    logger.info(`Ready! Logged in as ${readyClient.user.tag}`);
})

bot.login(tonyConfig.token)

declare module 'discord.js' {
    interface Client {
        commands: Collection<string, any>;
    }
}

bot.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            bot.commands.set(command.data.name, command);
        } else {
            console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

bot.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return; // ignore non-command interactions
    console.log(interaction);

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});
