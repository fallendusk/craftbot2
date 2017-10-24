const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const fetch = require('node-fetch');
const fs = require('fs');

var craftData = Array();

const writeCraftData = (data) => {
    console.log('Saving craft data to disk...');
    fs.writeFile('./data.json', JSON.stringify(data, null, 2));
    console.log('Save Complete.');
}

const loadCraftData = () => {
    console.log('Loading craft data...');
    data = JSON.parse(fs.readFileSync('./data.json'));
    return data;
}

const fetchXivDbItemById = (itemid) => {
    const xivdbBaseUrl = "https://api.xivdb.com/recipe/";
    return new Promise((resolve, reject) => {
        fetch(`${xivdbBaseUrl}${itemid}`).then(response => {
            if (response.ok) {
                return response;
            } else {
                let errorMessage = `${response.status} (${response.statusText})`,
                    error = new Error(errorMessage);
                throw(error);
            }
        })
        .then(response => response.json())
        .then(body => {
            console.log(`[DEBUG] ${body}`);
            resolve(body);
        })
        .catch(error => console.error(`Error in fetch: ${error.message}`));
    });
};

client.on('ready', () => {
    craftData = loadCraftData();
    console.log(`CraftBot connected! Serving ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    client.user.setGame(`i <3 kal`)
});

client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  });

client.on('message', async msg => {
    if (msg.author.bot) return;
    if (msg.content.indexOf(config.prefix) !== 0) return;

    // seperate command from arguments
    const args = msg.content.slice(config.prefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();

    console.log(`[DEBUG] command: ${cmd}`);
    console.log(`[DEBUG] args: ${args}`);
    
    if (cmd === 'hello') {
        msg.channel.send(`Hello ${msg.member}!`)
    }

    if (cmd === 'loveme') {
        msg.channel.send(`<3 <3 <3 ${msg.member}`)
    }

    if (cmd === 'help') {
        msg.channel.send("Commands:");
        msg.channel.send("!craft request [xivdb receipe id] [hq] [q:value]")
        msg.channel.send("!craft hello")

    }

    if (cmd === 'github') {
        msg.channel.send('View my source code @ ')
    }

    if (cmd === 'complete') {

    }
    if (cmd === 'claim') {
        if (!args[0]) {
            return msg.reply('Please specify a request id.');
        }
        // set claimed
        var request = parseInt(args[0]);                 
        var lookup = {};
        for (var i = 0, len = craftData.length; i < len; i++) {
            lookup[craftData[i].id] = craftData[i];
        }

        lookup[request].claimedBy = msg.member;
        lookup[request].claimed = true;
        msg.channel.send(`Request for **${lookup[request].itemName}** claimed by ${msg.member}`);

    }

    if (cmd === "claims") {
        console.log(craftData);
        let fields = [];
        for (var i = 0, len = craftData.length; i < len; i++) {
            if (craftData[i].claimed) {
                fields.push({
                    name: `${craftData[i].id}. [${craftData[i].itemName}](http://xivdb.com/recipe/${craftData[i].itemId})`,
                    value: `**Requestee**: ${craftData[i].owner}, **Quantity**: ${craftData[i].quantity}, **HQ**: ${craftData[i].hq}, **Claimed by**: ${craftData[i].claimedBy}`
                })
            }
        }

        msg.channel.send({embed: {
            title: "Claimed Crafting Requests",
            description: "Use !craft complete [id] to complete a request.",
            fields: fields,
            timestamp: new Date(),
        }});
    }

    if (cmd === "list") {
        console.log(craftData);
        let fields = [];
        for (var i = 0, len = craftData.length; i < len; i++) {
            if (!craftData[i].claimed) {
                fields.push({
                    name: `${craftData[i].id}. [${craftData[i].itemName}](http://xivdb.com/recipe/${craftData[i].itemId})`,
                    value: `**Requestee**: ${craftData[i].owner}, **Quantity**: ${craftData[i].quantity}, **HQ**: ${craftData[i].hq}`
                })
        }
        }

        msg.channel.send({embed: {
            title: "Unclaimed Crafting Requests",
            description: "Use !craft claim [id] to claim a request.",
            fields: fields,
            timestamp: new Date(),
        }});
    }
    if (cmd === 'request') {
        var hq = false; 
        var quantity = "1";
        if (!args[0]) {
            return msg.reply(`Please specify an XIVDB item id`);
        }

        if (args.length > 1) {
            // figure out if HQ and quantity specified
            // !craft request itemid hq q:2
            for (var i = 1, len = args.length; i < len; i++) {
                if (!hq) { hq = (args[i] === "hq") ? true : false };
                let qRex = /(?!q\:)\d+/;
                if (qRex.exec(args[i])) {
                    quantity = qRex.exec(args[i])[0];
                }
            }
        }
        fetchXivDbItemById(args[0])
        .then(res => {
            let requestId = craftData.slice(-1).pop() ? craftData.slice(-1).pop().id + 1 : 1;
            let data = {
                id: requestId,
                owner: `${msg.member}`,
                itemId: args[0],
                itemName: res.item.name,
                claimed: false,
                complete: false,
                claimedBy: "",
                craftClass: res.class_name,
                craftLevel: res.level_view,
                hq: hq,
                quantity: quantity
            };
            craftData.push(data);
            var isHq;
            if (data.hq && res.can_hq === 1) {
                isHq = "HQ"
            } else {
                isHq = ""
            }
            msg.channel.send(`Crafting request for ${data.itemName} ${isHq} x${data.quantity} created!`);
            msg.channel.send(`Requires Level ${data.craftLevel} ${data.craftClass}. Use !craft claim ${data.id} to claim this request.`);

            writeCraftData(craftData);
        })
        .catch(err => {
            msg.channel.send(`An error occured fetching item data from XIVDB`);
            console.error(err);
        });

    }
});

client.login(config.token);