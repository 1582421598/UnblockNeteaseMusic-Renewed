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
    id: { song: song.mid, file: song.mid },
    name: song.name,
    duration: song.interval * 1000,
    album: { id: song.album.mid, name: song.album.name },
    artists: song.singer.map(({ mid, name }) => ({ id: mid, name })),
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
            const result = jsonBody.search.data.body.song.list
                .slice(0, 5)
                .map(format);
            const matched = select.selectList(result, info);
            weight = matched.weight;
            return matched
                ? matched.id
                : Promise.reject("qqmusic: do_search: not matched.");
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
                filename: [format.join(id.file)],
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
            return midurlinfo[0].purl
                ? {
                      url: sip[0] + midurlinfo[0].purl,
                      weight: weight,
                  }
                : Promise.reject();
        });
};

const track = (id) => {
    id.key = id.file;
    return Promise.all(
        [
            ["F000", ".flac"],
            ["M800", ".mp3"],
            ["C400", ".m4a"],
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
