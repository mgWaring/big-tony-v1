module.exports = (bot, channelID, args, user) => {
    const craic = generateArray({
        "no bad, yersel?":12,
        "Com ci, com ça":6,
        "I'm great, but dom sucks":2,
        "Fine... I guess":4,
        "Yeah, great. Thanks for asking :)":10,
        "Pretty bored. You people always ask me the same stuff":3,
        "I'm ok. I feel bad about always shitting on Dom":1
    })
    bot.sendMessage({
        to: channelID,
        message: rando(craic)
    });
}

const rando = (array) => {
    return array[Math.floor(Math.random() * Math.floor(array.length))]
}

const generateArray = (dict) => {
    return Object.keys(dict).reduce((previous, key) => previous.concat(Array(dict.key).fill(key,0)), [])
}