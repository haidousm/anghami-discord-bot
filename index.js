const Discord = require("discord.js");
const ytdl = require("ytdl-core");
const yts = require("yt-search");
const axios = require("axios").default;
const $ = require("cheerio");

const prefix = process.env.DISCORD_PREFIX;

const client = new Discord.Client();
const queue = new Map();

client.once("ready", () => {
    console.log("Ready!");
});

client.once("reconnecting", () => {
    console.log("Reconnecting!");
});

client.once("disconnect", () => {
    console.log("Disconnect!");
});

client.on("message", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    let isMoussa = false;

    if (message.member.id == process.env.DISCORD_MOUSSA_ID) {
        isMoussa = true;
    }

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.channel.send("join the channel dumbo");

    if (!queue.get(message.guild.id)) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: false,
            player: null,
        };

        queue.set(message.guild.id, queueContruct);
    }

    let serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}tightrope`)) {
        if (serverQueue.player !== null && !serverQueue.playing) {
            serverQueue.player.resume();
            serverQueue.playing = true;
            message = "tightrope LP";
            if (isMoussa) {
                message.channel.send(
                    "has anyone ever told you that you have an amazing music taste??"
                );
            } else {
                message.channel.send("ok im resuming");
            }
        } else {
            playSongs(message, serverQueue, isMoussa);
        }
        return;
    } else if (message.content.startsWith(`${prefix}play`)) {
        if (serverQueue.player !== null && !serverQueue.playing) {
            serverQueue.player.resume();
            serverQueue.playing = true;
            if (isMoussa) {
                message.channel.send(
                    "has anyone ever told you that you have an amazing music taste??"
                );
            } else {
                message.channel.send("ok im resuming");
            }
        } else {
            playSongs(message, serverQueue, isMoussa);
        }
        return;
    } else if (
        message.content.startsWith(`${prefix}skip`) ||
        message.content.startsWith(`${prefix}fs`)
    ) {
        if (isMoussa) {
            message.channel.send(
                "im looking forward to the next song cause youre music taste is amazing!"
            );
        } else {
            message.channel.send("thank fuck i couldnt bare it anymore");
        }
        skip(message, serverQueue);
        return;
    } else if (
        message.content.startsWith(`${prefix}pause`) ||
        message.content.startsWith(`${prefix}p`)
    ) {
        if (isMoussa) {
            message.channel.send("as you wish <3");
        } else {
            message.channel.send("ugh ok i paused");
        }

        serverQueue.player.pause();
        serverQueue.playing = false;
        return;
    } else if (message.content.startsWith(`${prefix}stop`)) {
        if (isMoussa) {
            message.channel.send("gonna miss you !!");
        } else {
            message.channel.send("bye bitch");
        }

        stop(message, serverQueue);
        return;
    } else if (
        message.content.startsWith(`${prefix}queue`) ||
        message.content.startsWith(`${prefix}q`)
    ) {
        let queue = "";
        if (isMoussa) {
            queue = "here's the best song list ever:\n";
        } else {
            queue = "here's your shit song list:\n";
        }

        let i = 1;
        for (const song of serverQueue.songs) {
            queue += `${i} - ${song.title}\n`;
            i++;
        }
        message.channel.send(queue);
        return;
    } else if (message.content.startsWith(`${prefix}shuffle`)) {
        if (isMoussa) {
            message.channel.send(
                "im super excited to see what song ill get to play for you<3\n"
            );
        } else {
            message.channel.send("no shuffling will fix your ass music taste");
        }

        serverQueue.songs = shuffle(serverQueue.songs);
        skip(message, serverQueue);
        return;
    } else {
        message.channel.send("bruh tf did you write??");
    }
});

async function playSongs(message, serverQueue, isMoussa) {
    let command = message.content;
    let userUrl = command.substr(command.indexOf(" ") + 1);

    var connection = await serverQueue.voiceChannel.join();
    serverQueue.connection = connection;

    let rawSongs = [];

    if (
        userUrl.includes("anghami") &&
        (userUrl.includes("playlist") || userUrl.includes("album"))
    ) {
        rawSongs = await getAnghamiPlaylist(userUrl);
    } else {
        rawSongs.push(userUrl);
    }

    if (serverQueue.songs.length == 0 && serverQueue.playing == false) {
        let firstSong = await parseRawSong(rawSongs.shift());
        try {
            play(message.guild, firstSong, isMoussa);
            serverQueue.playing = true;
        } catch (err) {
            console.log(err);
            return message.channel.send(err);
        }
    }

    for (const rawSong of rawSongs) {
        let song = await parseRawSong(rawSong);
        serverQueue.songs.push(song);
    }
}

async function parseRawSong(rawSong, serverQueue) {
    let url = rawSong;

    let ytVideo = (await yts(url)).videos[0];

    const song = {
        title: ytVideo.title,
        url: ytVideo.url,
    };

    return song;
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send("join the voice channel first pls");
    if (!serverQueue) return message.channel.send("skip what G?");
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send("do not disturb them son");

    if (!serverQueue) return message.channel.send("are you dumb");

    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

function play(guild, song, isMoussa) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            play(guild, serverQueue.songs.shift(), isMoussa);
        })
        .on("error", (error) => console.error(error));
    serverQueue.player = dispatcher;
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

    if (isMoussa) {
        serverQueue.textChannel.send(
            `im playing this amazing song **${song.title}**`
        );
    } else {
        serverQueue.textChannel.send(
            `im playing this shit song **${song.title}**`
        );
    }
}

const getAnghamiPlaylist = async (anghamiPlaylistUrl) => {
    try {
        const anghamiPlaylist = [];
        const html = await (await axios.get(anghamiPlaylistUrl)).data;
        let numberOfSongs = $(".table .table-row", html).length;

        for (let i = 0; i < numberOfSongs; i++) {
            let songTitle = $(
                $(".table .table-row .cell-title span", html)[i]
            ).text();
            let songArtist = $(
                $(".table .table-row .cell-artist a", html)[i]
            ).text();

            let songData = songTitle + " " + songArtist;
            anghamiPlaylist.push(songData);
        }

        return anghamiPlaylist;
    } catch (err) {
        console.error(err);
    }
};

const shuffle = (arr) =>
    [...arr].reduceRight(
        (res, _, __, s) => (
            res.push(s.splice(0 | (Math.random() * s.length), 1)[0]), res
        ),
        []
    );

client.login(process.env.DISCORD_TOKEN);
