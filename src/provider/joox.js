const cache = require('../cache')
const insure = require('./insure')
const select = require('./select')
const crypto = require('../crypto')
const request = require('../request')

const headers = {
	'origin': 'http://www.joox.com',
	'referer': 'http://www.joox.com',
	'cookie': process.env.JOOX_COOKIE || null, // 'wmid=<your_wmid>; session_key=<your_session_key>;'
}

const fit = info => {
	if (/[\u0800-\u4e00]/.test(info.name)) //is japanese
		return info.name
	else
		return info.keyword
}

const format = song => {
	const {
		decode
	} = crypto.base64
	return {
		id: song.songid,
		name: decode(song.info1 || ''),
		duration: song.playtime * 1000,
		album: {
			id: song.albummid,
			name: decode(song.info3 || '')
		},
		artists: song.singer_list.map(({
			id,
			name
		}) => ({
			id,
			name: decode(name || '')
		})),
		weight: 0
	}
}

var weight = 0

const search = info => {
	const keyword = fit(info)
	const url =
		'http://api-jooxtt.sanook.com/web-fcgi-bin/web_search?' +
		'country=hk&lang=zh_TW&' +
		'search_input=' + encodeURIComponent(keyword) + '&sin=0&ein=5'

	return request('GET', url, headers)
		.then(response => response.body())
		.then(body => {
			const jsonBody = JSON.parse(body.replace(/'/g, '"'))
			const list = jsonBody.itemlist.map(format)
			const matched = select.selectList(list, info)
			weight = matched.weight
			return matched ? matched.id : Promise.reject()
		})
}

const track = id => {
	const url =
		'http://api.joox.com/web-fcgi-bin/web_get_songinfo?' +
		'songid=' + id + '&country=hk&lang=zh_cn&from_type=-1&' +
		'channel_id=-1&_=' + (new Date).getTime()

	return request('GET', url, headers)
		.then(response => response.jsonp())
		.then(jsonBody => {
			const songUrl = (jsonBody.r320Url || jsonBody.r192Url || jsonBody.mp3Url || jsonBody.m4aUrl).replace(/M\d00([\w]+).mp3/, 'M800$1.mp3')
			if (songUrl)
				return {
					url: songUrl,
					weight: weight
				}
			else
				return Promise.reject()
		})
		.catch(() => insure().joox.track(id))
}

const check = info => cache(search, info).then(track)

module.exports = {
	check,
	track
}