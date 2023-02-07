const cache = require("../cache");
const insure = require("./insure");
const select = require("./select");
const request = require("../request");
const crypto = require("../crypto");

const headers = {
    origin: "https://y.qq.com",
    referer: "https://y.qq.com/",
    cookie: process.env.QQ_COOKIE || null, // 'uin=; qm_keyst=',
};

var myguid = String(
    (Math.round(2147483647 * Math.random()) * new Date().getUTCMilliseconds()) %
        1e10
);
var weight = 0;

const format = (song) => ({
    id: {
        song: song.mid,
        file: song.file.media_mid,
    },
    name: song.title,
    duration: song.interval * 1000,
    album: {
        id: song.album.mid,
        name: song.album.title,
    },
    artists: song.singer.map(({ mid, title }) => ({
        id: mid,
        title,
    })),
    weight: 0,
});

const search = (info) => {
    const url =
        "https://u.y.qq.com/cgi-bin/musicu.fcg?data=" +
        encodeURIComponent(
            JSON.stringify({
                search: {
                    method: "DoSearchForQQMusicDesktop",
                    module: "music.search.SearchCgiService",
                    param: {
                        num_per_page: 5,
                        page_num: 1,
                        query: info.keyword,
                        search_type: 0,
                    },
                },
            })
        );

    return request("GET", url, headers)
        .then((response) => response.json())
        .then((jsonBody) => {
            const list = jsonBody.search.data.body.song.list.map(format);
            const matched = select.selectList(list, info);
            weight = matched.weight;
            return matched ? matched.id : Promise.reject();
        });
};

const single = (id, format) => {
    const uin = ((headers.cookie || "").match(/uin=(\d+)/) || [])[1] || "0";
    data = JSON.stringify({
        req_0: {
            module: "vkey.GetVkeyServer",
            method: "CgiGetVkey",
            param: {
                guid: myguid,
                loginflag: 1,
                filename: format[0] ? [format.join(id.file)] : null,
                songmid: [id.song],
                songtype: [0],
                uin,
                platform: "20",
            },
        },
    });

    const url =
        "https://u.y.qq.com/cgi-bin/musicu.fcg?loginUin=0&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0&data=" +
        encodeURIComponent(data);

    return request("GET", url, headers)
        .then((response) => response.json())
        .then((jsonBody) => {
            const { sip, midurlinfo } = jsonBody.req_0.data;

            if (!midurlinfo[0].purl) return Promise.reject();

            const playurl = sip[0] + midurlinfo[0].purl;
            const header = {
                range: "bytes=0-8191",
                "accept-encoding": "identity",
            };
            return request("GET", playurl, header).then((response) => {
                if (response.statusCode < 200 || response.statusCode > 299)
                    return Promise.reject();
                else return { url: playurl, weight: weight };
            });
        });
};

const track = (id) => {
    id.key = id.file;
    return Promise.all(
        [
            ["F000", ".flac"],
            ["M800", ".mp3"],
            ['M500', '.mp3'],
            ["C400", ".m4a"],
            [null, null],
        ]
            .slice(
                headers.cookie || typeof window !== "undefined"
                    ? select.ENABLE_FLAC
                        ? 0
                        : 1
                    : 2
            )
            .map((format) => single(id, format).catch(() => null))
    )
        .then((result) => {
            let url = result.find((url) => url);
            if (url) {
                return {
                    url: url,
                    weight: weight,
                };
            } else Promise.reject();
        })
        .catch(() => insure().qq.track(id));
};

const check = (info) => cache(search, info).then(track);

module.exports = {
    check,
    track,
};
