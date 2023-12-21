if (process.env.ENV !== 'production') {
    require('dotenv').config();
}
import { Client, Events, GatewayIntentBits } from 'discord.js';
import winston from 'winston';
import {tonyConfig} from './config/config';

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
const targetChannel = "1187517383569588244"

if(!tonyConfig.token) throw new Error("No discord token!")
const bot = new Client({ intents: [GatewayIntentBits.Guilds]})
bot.once(Events.ClientReady, (readyClient) => {
	logger.info(`Ready! Logged in as ${readyClient.user.tag}`);
})
bot.login(tonyConfig.token)


export type Command = (bot: Client<boolean>, channelID: string, args: string[], user: string) => void

const commands: Record<string, Command> = {
    'hi': require('./commands/hi'),
    'minecraft': require('./commands/minecraft'),
    'craic': require('./commands/craic')
}



bot.on('ready', evt => {
    logger.info('Connected')
    logger.info('Logged in as: ')
    logger.info(bot.username + ' - (' + bot.id + ')')
});

bot.on('message', (user, userID, channelID, message, evt) => {
    if (channelID == targetChannel && userID != bot.id && message.startsWith('!')) {
        logger.info(user + ' is asking me to ' + JSON.stringify(message))
        const input = message.substring(1).split(' ')
        if (Object.keys(commands).includes(input[0])) commands[input[0].toLowerCase()](bot, channelID, input.splice(1), user)
        else bot.sendMessage({ to: channelID, message: `I ain't gonna do that ${user}` });
    }
});