import { minecraftVariables } from '../../config/config';
import {
    addAlarm,
    awaitInstance,
    describe,
    flattenResToId,
    formatDescription,
    instantiate,
    pauseFor,
    shutDown,
    triggerSave
} from '../../aws_helpers/helpers';
import { createLogger, format as _format, transports as _transports } from 'winston';
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

const logger = createLogger({
    level: 'info',
    format: _format.json(),
    defaultMeta: { service: 'tony-recall' },
    transports: [
        new _transports.File({ filename: 'error.log', level: 'error' }),
        new _transports.File({ filename: 'general.log' }),
    ],
});

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

const startServer = async (interaction: ChatInputCommandInteraction) => {
    try {
        const reservation = await instantiate(launchCommand);
        const status = await awaitInstance(reservation);
        if(!reservation.Instances) throw new Error("No instances reserved")

        interaction.followUp(`Started on ${reservation.Instances[0].PublicIpAddress}`)
        await pauseFor(60)
        logger.info("wait over")
        const server = await describe()
        await addAlarm(server)
    }
    catch (e: any) {
        logger.error(e.message)
    }
}

const stopServer = async (interaction: ChatInputCommandInteraction) => {
    try {
        const saveData = await triggerSave()
        logger.info("run command sent", saveData)

        interaction.followUp(`Level saved (I hope...)`)

        await pauseFor(60)
        logger.info("wait over")
        const description = describe()
        const instances = flattenResToId(description)
        const shutdownResponse = await shutDown(instances)

        logger.info(shutdownResponse)

        interaction.followUp(`All Beans have been crushed (${shutdownResponse?.TerminatingInstances?.length} Instances terminated)`)

    } catch (e: any) {
        logger.error(e.message)
    }
}

const getInstanceStatus = async (interaction: ChatInputCommandInteraction) => {
    try {
        const description = await describe()
        const formatted = formatDescription(description)

        interaction.followUp(formatted)
    } catch (e: any) { logger.error(e) }
}


export const data = new SlashCommandBuilder()
    .setName('minecraft')
    .setDescription('establishes a minecraft server');

export const execute = async (interaction: ChatInputCommandInteraction) => {
    const params = interaction.options.data.map((option: any) => option.value)
    let message = ''
    switch (params[0]) {
        case 'start':
            startServer(interaction)
            message = "starting"
            break;
        case 'stop':
            stopServer(interaction)
            message = "stopping"
            break;
        case 'destroy':
            message = "destroying"
            break;
        case 'status':
            getInstanceStatus(interaction)
            message = "fetching status"
            break;
        default:
            message = params ? `what does ${params[0]} mean?` : "you have to tell me what to do..."
    }
    await interaction.reply(message);
}