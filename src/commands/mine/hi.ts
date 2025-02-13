import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('hi')
    .setDescription('Greets you nicely');

export const execute = async (interaction: ChatInputCommandInteraction) => {
    const name = interaction.user.username;

    let message = `Hello ${name}!`

    if (name === 'Dom') {
        message = "Hey Dom, you suck"
    }

    await interaction.reply(message);
}

// const hi: Command = (bot, channelID, args, user) => {
//     let str = args.join(' ')
//     let message = `Hey ${str}, ${user} says hello!`

//     if (args[0].toLowerCase() === 'tony') {
//         message = `Hello ${user}!`
//     } else if (user === 'Dom') {
//         message = "Hey Dom, you suck"
//     }
//     bot.sendMessage({
//         to: channelID,
//         message: message
//     });
// }