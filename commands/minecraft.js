const config = require('../config/minecraft.json')
const {
    addAlarm,
    awaitStatus,
    describe,
    flattenResToId,
    formatDescription,
    instantiate,
    pauseFor,
    shutDown,
    triggerSave
} = require('../aws_helpers/helpers')
const winston = require('winston')


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

const vox = {
    channel: null,
    bot: null,
    say: (message) => vox.bot.sendMessage({ to: vox.channel, message: message }),
    cri: (e) => {
        logger.error(e)
        vox.say('something broke, sorry')
    }
}

//     docker container create -v ~/worlds:/worlds -e WORLD=/worlds/Beans.zip -e EULA=true --name beans -p 25565:25565 itzg/minecraft-server
const envStr = (o) => Object.keys(o).reduce((p, k) => p + ' -e ' + k + '=' + o[k], '')
const launchCommand = `
#! /bin/bash
yum update -y
amazon-linux-extras install docker -y
sudo service docker start
mkdir ~/worlds
aws s3 cp s3://big-tony-minecraft-beans/Beans.zip ~/worlds/Beans.zip
docker container create -v ~/worlds:/worlds ${envStr(config)} --name beans -p 25565:25565 itzg/minecraft-server
docker start -a beans
`

const startServer = async () => {
    instantiate(launchCommand)
        .then((data) => awaitStatus(data))
        .then((data) => vox.say(`Started on ${data.Reservations[0].Instances[0].PublicIpAddress}`))
        .then(() => pauseFor(60))
        .then(() => logger.info("wait over"))
        .then(() => describe())
        .then((data) => addAlarm(data))
        .catch(e => vox.cri(e))
}

const stopServer = async () => {
    triggerSave()
        .then(data => {
            logger.info("run command sent", data)
            vox.say(`Level saved (I hope...)`)
        })
        .then(() => pauseFor(60))
        .then(() => logger.info("wait over"))
        .then(() => describe())
        .then((data) => flattenResToId(data))
        .then((instances) => shutDown(instances))
        .then((data) => {
            logger.info(data)
            vox.say(`All Beans have been crushed (${data.TerminatingInstances.length} Instances terminated)`)
        })
        .catch(e => vox.cri(e))
}

const getInstanceStatus = () => {
    describe()
        .then(data => formatDescription(data))
        .then(description => vox.say(description))
        .catch(e => vox.cri(e))
}

module.exports = (bot, channelID, args, user) => {
    let input = args.join(' ').trim()
    vox.channel = channelID
    vox.bot = bot

    switch (input) {
        case 'start':
            startServer(bot, channelID)
            message = "starting"
            break;
        case 'stop':
            stopServer(bot, channelID)
            message = "stopping"
            break;
        case 'destroy':
            message = "destroying"
            break;
        case 'status':
            getInstanceStatus(bot, channelID)
            message = "fetching status"
            break;
        default:
            message = args ? `what does ${input} mean?` : "you have to tell me what to do..."
    }

    vox.say(message)
}