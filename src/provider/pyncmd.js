const select = require('./select');
const request = require('../request');
const cache = require('../cache');

const init = () => {
	return request('GET', 'https://mos9527.tooo.top/ncm/stats/server')
		.then((response) => cookie = response.headers['set-cookie'][0])
		.catch(e => console.log(e))
}

const track = (info) => {
	const url =
		'https://mos9527.tooo.top/ncm/pyncm/track/GetTrackAudio?song_ids=' +
		info.id +
		'&bitrate=' + ['999000', '320000'].slice(
			select.ENABLE_FLAC ? 0 : 1,
			select.ENABLE_FLAC ? 1 : 2
		);
	return cache(init, undefined, 24 * 60 * 60 * 1000).then(cookie => (
		request('GET', url, {
			'referer': 'https://mos9527.tooo.top/ncm/',
			'cookie': cookie
		})
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
	))
};

const check = info => cache(track, info)

module.exports = {
	check
};