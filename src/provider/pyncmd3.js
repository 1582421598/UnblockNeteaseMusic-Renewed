const select = require('./select');
const request = require('../request');
const cache = require('../cache');

const track = (info) => {
	const url =
		'https://service-ghlrryee-1308098780.gz.apigw.tencentcs.com/release/pyncmd/track/GetTrackAudio?song_ids=' +
		info.id +
		'&bitrate=' + ['999000', '320000'].slice(
			select.ENABLE_FLAC ? 0 : 1,
			select.ENABLE_FLAC ? 1 : 2
		);
	return request('GET', url)
		.then((response) => response.json())
		.then((jsonBody) => {
			if (
				jsonBody &&
				typeof jsonBody === 'object' &&
				'code' in jsonBody &&
				jsonBody.code !== 200
			)
				return Promise.reject();

			const matched = jsonBody.data.find((song) => song.id === info.id);
			if (matched && matched.url) return {
				url: matched.url,
				weight: Number.MAX_VALUE
			};

			return Promise.reject();
		})
};

const check = info => cache(track, info)

module.exports = {
	check
};