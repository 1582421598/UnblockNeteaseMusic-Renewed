const select = require("./select");
const request = require("../request");
const cache = require("../cache");

const track = (info) => {
    const url =
        "http://76.76.21.114/api/pyncm?module=track&method=GetTrackAudio&song_ids=" +
        info.id +
        "&bitrate=" +
        ["999000", "320000"].slice(
            select.ENABLE_FLAC ? 0 : 1,
            select.ENABLE_FLAC ? 1 : 2
        );
    const headers = {
        Host: "pyncmd.gov.cn",
    };
    return request("GET", url, headers)
        .then((response) => response.json())
        .then((jsonBody) => {
            if (
                jsonBody &&
                typeof jsonBody === "object" &&
                "code" in jsonBody &&
                jsonBody.code !== 200
            )
                return Promise.reject();

            const matched = jsonBody.data.find((song) => song.id === info.id);
            if (matched && matched.url)
                return {
                    url: matched.url,
                    weight: Number.MAX_VALUE,
                };

            return Promise.reject();
        });
};

const check = (info) => cache(track, info);

module.exports = {
    check,
};
