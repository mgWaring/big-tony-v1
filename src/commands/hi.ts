import { Command } from "../tony"

const hi: Command = (bot, channelID, args, user) => {
    let str = args.join(' ')
    let message = `Hey ${str}, ${user} says hello!`

    if (args[0].toLowerCase() === 'tony') {
        message = `Hello ${user}!`
    } else if (user === 'Dom') {
        message = "Hey Dom, you suck"
    }
    bot.sendMessage({
        to: channelID,
        message: message
    });
}

export default hi;