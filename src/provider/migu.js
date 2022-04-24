const insure = require('./insure');
const select = require('./select');
const request = require('../request');
const cache = require('../cache');

const format = (song) => {
	return {
		id: song.id,
		name: song.name,
		album: song.albums && song.albums[0],
		artists: song.singers,
		resources: song.newRateFormats.map((detail) => ({
			formatType: detail.formatType,
			url: encodeURI(detail.url || detail.androidUrl),
		})),
		weight: 0
	};
};

var weight = 0

const search = (info) => {
	const url =
		'https://pd.musicapp.migu.cn/MIGUM3.0/v1.0/content/search_all.do?' +
		'&ua=Android_migu&version=5.0.1&pageNo=1&pageSize=10&text=' +
		encodeURIComponent(info.keyword) +
		'&searchSwitch=' +
		'{"song":1,"album":0,"singer":0,"tagSong":0,"mvSong":0,"songlist":0,"bestShow":1}';

	return request('GET', url)
		.then((response) => response.json())
		.then((jsonBody) => {
			const list = ((jsonBody || {}).songResultData.result || []).map(
				format
			);
			const matched = select.selectList(list, info);
			weight = matched.weight;
			return matched ? matched.resources : Promise.reject();
		});
};

const single = (resources, format) => {
	const song = resources.find(
		(song) => song.url && song.formatType === format
	);

	if (song) {
		const playUrl = new URL(song.url);
		playUrl.protocol = 'http';
		playUrl.hostname = 'freetyst.nf.migu.cn';
		return {
			url: playUrl.href,
			weight: weight
		};
	} else return false;
};

const track = (resources) =>
	Promise.all(
		['ZQ', 'SQ', 'HQ', 'PQ']
		.slice(select.ENABLE_FLAC ? 0 : 2)
		.map((format) => single(resources, format))
	)
	.then((result) => {
		let url = result.find((url) => url)
		if (url) {
			return {
				url: url,
				weight: weight
			}
		} else Promise.reject()
	}).catch(() => insure().migu.track(resources));

const check = info => cache(search, info).then(track)

module.exports = {
	check,
	track
};