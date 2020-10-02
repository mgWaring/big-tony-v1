if (process.env.ENV !== 'production') {
    require('dotenv').config();
}

const Discord = require('discord.io');
const winston = require('winston');
const { tonyConfig } = require('./config/config');
console.log(tonyConfig)
const targetChannel = 757999018386391140

const bot = new Discord.Client({
    token: tonyConfig.token,
    autorun: true
})

const commands = {
    'hi': require('./commands/hi'),
    'minecraft': require('./commands/minecraft'),
    'craic': require('./commands/craic')
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'tony-recall' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'general.log' }),
        new winston.transports.Console({ colorize: true, level: 'silly' }),
    ],
});

bot.on('ready', evt => {
    logger.info('Connected')
    logger.info('Logged in as: ')
    logger.info(bot.username + ' - (' + bot.id + ')')
});

bot.on('message', (user, userID, channelID, message, evt) => {
    if (channelID == targetChannel && userID != bot.userID && message.substring(0, 1) == '!') {
        logger.info(user + ' is asking me to ' + JSON.stringify(message))
        const input = message.substring(1).split(' ')
        if (Object.keys(commands).includes(input[0])) commands[input[0].toLowerCase()](bot, channelID, input.splice(1), user)
        else bot.sendMessage({ to: channelID, message: `I ain't gonna do that ${user}` });
    }
});