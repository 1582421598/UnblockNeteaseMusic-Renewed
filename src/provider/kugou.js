const insure = require('./insure');
const select = require('./select');
const crypto = require('../crypto');
const request = require('../request');
const cache = require('../cache');

const format = (song) => {
	return {
		// id: song.FileHash,
		// name: song.SongName,
		// duration: song.Duration * 1000,
		// album: {id: song.AlbumID, name: song.AlbumName},
		// artists: song.SingerId.map((id, index) => ({id, name: SingerName[index]}))
		id: song['hash'],
		id_hq: song['320hash'],
		id_sq: song['sqhash'],
		name: song['songname'],
		duration: song['duration'] * 1000,
		album: {
			id: song['album_id'],
			name: song['album_name']
		},
		weight: 0
	};
};

var weight = 0

const search = (info) => {
	const url =
		// 'http://songsearch.kugou.com/song_search_v2?' +
		'http://mobilecdn.kugou.com/api/v3/search/song?' +
		'keyword=' +
		encodeURIComponent(info.keyword) +
		'&page=1&pagesize=5';

	return request('GET', url)
		.then((response) => response.json())
		.then((jsonBody) => {
			// const list = jsonBody.data.lists.map(format)
			const list = jsonBody.data.info.map(format);
			const matched = select.selectList(list, info)
			weight = matched.weight
			return matched ? matched : Promise.reject();
		})
		.catch(() => insure().kugou.search(info));
};

const single = (song, format) => {
	const getHashId = () => {
		switch (format) {
			case 'hash':
				return song.id;
			case 'hqhash':
				return song.id_hq;
			case 'sqhash':
				return song.id_sq;
			default:
				break;
		}
		return '';
	};

	const url =
		'http://trackercdn.kugou.com/i/v2/?' +
		'key=' +
		crypto.md5.digest(`${getHashId()}kgcloudv2`) +
		'&hash=' +
		getHashId() +
		'&' +
		'appid=1005&pid=2&cmd=25&behavior=play&album_id=' +
		song.album.id;
	return request('GET', url)
		.then((response) => response.json())
		.then((result) => {
			let url = result.find((url) => url);
			if (url) {
				return {
					url: url,
					weight: weight,
				};
			} else Promise.reject();
		})
		.catch(() => insure().kugou.track(song));
};

const track = (song) =>
	Promise.all(
		['sqhash', 'hqhash', 'hash']
		.slice(select.ENABLE_FLAC ? 0 : 1)
		.map((format) => single(song, format).catch(() => Promise.reject()))
	)
	.then((result) => {
		let url = result.find((url) => url)
		if (url) {
			return {
				url: url,
				weight: weight
			}
		} else Promise.reject()
	})
	.catch(() => insure().kugou.track(song));

const check = info => cache(search, info).then(track)

module.exports = {
	check,
	search
};