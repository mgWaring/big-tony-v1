import { minecraftVariables } from '../config/config';
import { addAlarm, awaitStatus, describe, flattenResToId, formatDescription, instantiate, pauseFor, shutDown, triggerSave } from '../aws_helpers/helpers';
import { createLogger, format as _format, transports as _transports } from 'winston';
import { Command } from '../tony';

interface Vox {
    channel: string;
    bot: any;
    say: (message: string) => void;
    cri: (e: Error) => void;
}

const logger = createLogger({
    level: 'info',
    format: _format.json(),
    defaultMeta: { service: 'tony-recall' },
    transports: [
        new _transports.File({ filename: 'error.log', level: 'error' }),
        new _transports.File({ filename: 'general.log' }),
    ],
});

const vox: Vox = {
    channel: '',
    bot: {},
    say: (message: string) => vox.bot.sendMessage({ to: vox.channel, message: message }),
    cri: (e: Error) => {
        logger.error(e)
        vox.say(`something broke, sorry: ${JSON.stringify(e)}`)
    }
}

// turns an object into a string of -e KEY=VALUE (turns json into env var like syntax)
const envStr = (o: { [key: string]: string }) => Object.keys(o).reduce((p, k) => p + ' -e ' + k + '=' + o[k], '')
const launchCommand = `
#! /bin/bash
yum update -y
amazon-linux-extras install docker -y
sudo service docker start
mkdir ~/worlds
aws s3 cp s3://big-tony-minecraft-beans/Beans.zip ~/worlds/Beans.zip
docker container create -v ~/worlds:/worlds ${envStr(minecraftVariables)} --name beans -p 42069:25565 itzg/minecraft-server
docker start -a beans
`

const startServer = async () => {
    try {
        const instance = await instantiate(launchCommand);
        const status = await awaitStatus(instance);
        if (status.$response.error) throw new Error(status.$response.error.message)
        if (!status.Reservations?.[0]?.Instances) throw new Error("Instance not running")
        vox.say(`Started on ${status.Reservations[0].Instances[0].PublicIpAddress}`)
        await pauseFor(60)
        logger.info("wait over")
        const server = await describe()
        await addAlarm(server)
    }
    catch (e: any) {
        vox.cri(e.message)
    }
}

const stopServer = async () => {
    try {
        const saveData = await triggerSave()
        logger.info("run command sent", saveData)
        vox.say(`Level saved (I hope...)`)

        await pauseFor(60)
        logger.info("wait over")
        const description = await describe()
        const instances = flattenResToId(description)
        const shutdownResponse = await shutDown(instances)

        logger.info(shutdownResponse)
        vox.say(`All Beans have been crushed (${shutdownResponse?.TerminatingInstances?.length} Instances terminated)`)

    } catch (e: any) {
        vox.cri(e.message)
    }
}

const getInstanceStatus = async () => {
    try {
        const description = await describe()
        const formatted = formatDescription(description)
        vox.say(formatted)
    } catch (e: any) { vox.cri(e) }
}

const minecraft: Command = (bot, channelID, args, user) => {
    let input = args.join(' ').trim()
    vox.channel = channelID
    vox.bot = bot

    let message: string;

    switch (input) {
        case 'start':
            startServer()
            message = "starting"
            break;
        case 'stop':
            stopServer()
            message = "stopping"
            break;
        case 'destroy':
            message = "destroying"
            break;
        case 'status':
            getInstanceStatus()
            message = "fetching status"
            break;
        default:
            message = args ? `what does ${input} mean?` : "you have to tell me what to do..."
    }

    vox.say(message)
}

export default minecraft;