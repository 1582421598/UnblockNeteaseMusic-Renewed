const select = require("./select");
const request = require("../request");
const cache = require("../cache");

const track = (info) => {
    const url =
        ["https://pyncmd.vercel.app", "http://76.76.21.114"].slice(
            select.CAN_ACCESS_GOOGLE ? 0 : 1,
            select.CAN_ACCESS_GOOGLE ? 1 : 2
        ) +
        "/api/pyncm?module=track&method=GetTrackAudio&song_ids=" +
        info.id +
        "&bitrate=" +
        ["999000", "320000"].slice(
            select.ENABLE_FLAC ? 0 : 1,
            select.ENABLE_FLAC ? 1 : 2
        );
    let headers = null;
    if (!select.CAN_ACCESS_GOOGLE) headers = { host: "pyncmd.gov.cn" };
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
