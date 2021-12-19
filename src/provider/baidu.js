const cache = require('../cache')
const insure = require('./insure')
const select = require('./select')
const request = require('../request')

const format = song => {
	const artistId = song.all_artist_id.split(',')
	return {
		id: song.song_id,
		name: song.title,
		album: {
			id: song.album_id,
			name: song.album_title
		},
		artists: song.author.split(',').map((name, index) => ({
			id: artistId[index],
			name
		})),
		weight: 0
	}
}

var weight = 0

const search = info => {
	const url =
		'http://musicapi.taihe.com/v1/restserver/ting?' +
		'from=qianqianmini&method=baidu.ting.search.merge&' +
		'isNew=1&platform=darwin&page_no=1&page_size=5&' +
		`query=${encodeURIComponent(info.keyword)}&version=11.2.1`

	return request('GET', url)
		.then(response => response.json())
		.then(jsonBody => {
			const list = jsonBody.result.song_info.song_list.map(format)
			const matched = select.selectList(list, info)
			weight = matched.weight
			return matched ? matched.id : Promise.reject()
		})
}

const track = id => {
	const url =
		'http://music.taihe.com/data/music/fmlink?' +
		'songIds=' + id + '&type=mp3'

	return request('GET', url)
		.then(response => response.json())
		.then(jsonBody => {
			if ('songList' in jsonBody.data) {
				let result = jsonBody.data.songList[0].songLink
				if (result) {
					return {
						url: result,
						weight: weight
					}
				} else Promise.reject()
			} else
				return Promise.reject()
		})
		.catch(() => insure().baidu.track(id))
}

const check = info => cache(search, info).then(track)

module.exports = {
	check
}