const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");
const yts = require("yt-search");
const axios = require("axios").default;
const $ = require("cheerio");

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

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(
            "You need to be in a voice channel to play music!"
        );

    if (!queue.get(message.guild.id)) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true,
        };

        queue.set(message.guild.id, queueContruct);
    }

    let serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}play`)) {
        playSongs(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}queue`)) {
        let queue = "";
        let i = 0;
        for (const song of serverQueue) {
            queue += `${i}- ${song.title}\n`;
        }
        message.channel.send(queue);
    } else {
        message.channel.send("bruh tf did you write??");
    }
});

async function playSongs(message, serverQueue) {
    let command = message.content;
    let userUrl = command.substr(command.indexOf(" ") + 1);

    var connection = await serverQueue.voiceChannel.join();
    serverQueue.connection = connection;

    let rawSongs = [];

    if (userUrl.includes("anghami") && userUrl.includes("playlist")) {
        rawSongs = await getAnghamiPlaylist(userUrl);
    } else {
        rawSongs.push(userUrl);
    }

    let firstSong = await parseRawSong(rawSongs.shift());
    try {
        play(message.guild, firstSong);
    } catch (err) {
        console.log(err);
        return message.channel.send(err);
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
        return message.channel.send(
            "You have to be in a voice channel to stop the music!"
        );
    if (!serverQueue)
        return message.channel.send("There is no song that I could skip!");
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "You have to be in a voice channel to stop the music!"
        );

    if (!serverQueue)
        return message.channel.send("There is no song that I could stop!");

    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", (error) => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Start playing: **${song.title}**`);
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

client.login(token);
