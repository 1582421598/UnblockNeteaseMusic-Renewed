const cache = require('../cache')
const request = require('../request')
const select = require('./select')
const parse = query => (query || '').split('&').reduce((result, item) => (item = item.split('=').map(decodeURIComponent), Object.assign({}, result, {
	[item[0]]: item[1]
})), {})

//const proxy = require('url').parse('http://127.0.0.1:8888')
const proxy = undefined
const key = process.env.YOUTUBE_KEY || null // YouTube Data API v3

const format = song => {
	song = song.videoRenderer
	return {
		id: song.videoId,
		name: song.title.runs[0].text,
		duration: song.lengthText.simpleText.split(':').reduce((minute, second) => minute * 60 + parseFloat(second), 0) * 1000,
		artists: song.ownerText.runs.map(data => ({
			name: data.text
		})),
		weight: 0
	}
}

var weight = 0

const signature = (id = '-tKVN2mAKRI') => {
	const url =
		`https://www.youtube.com/watch?v=${id}`

	return request('GET', url, {}, null, proxy)
		.then(response => response.body())
		.then(body => {
			let assets = /"WEB_PLAYER_CONTEXT_CONFIG_ID_KEVLAR_VERTICAL_LANDING_PAGE_PROMO":{[^}]+}/.exec(body)[0]
			assets = JSON.parse(`{${assets}}}`).WEB_PLAYER_CONTEXT_CONFIG_ID_KEVLAR_VERTICAL_LANDING_PAGE_PROMO
			return request('GET', 'https://youtube.com' + assets.jsUrl, {}, null, proxy).then(response => response.body())
		})
		.then(body => {
			const [_, funcArg, funcBody] = /function\((\w+)\)\s*{([^}]+split\(""\)[^}]+join\(""\))};/.exec(body)
			const helperName = /;(.+?)\..+?\(/.exec(funcBody)[1]
			const helperContent = new RegExp(`var ${helperName}={[\\s\\S]+?};`).exec(body)[0]
			return new Function([funcArg], helperContent + '\n' + funcBody)
		})
}

const apiSearch = info => {
	const url =
		`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(info.keyword)}&type=video&key=${key}`

	return request('GET', url, {
			accept: 'application/json'
		}, null, proxy)
		.then(response => response.json())
		.then(jsonBody => {
			const matched = jsonBody.items[0]
			if (matched)
				return matched.id.videoId
			else
				return Promise.reject()
		})
}

const search = info => {
	const url =
		`https://www.youtube.com/results?search_query=${encodeURIComponent(info.keyword)}`

	return request('GET', url, {}, null, proxy)
		.then(response => response.body())
		.then(body => {
			const initialData = JSON.parse(body.match(/ytInitialData\s*=\s*([^;]+);/)[1]).contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents
			const list = initialData.slice(0, 5).filter(data => data.videoRenderer).map(format) // 取前五个视频
			const matched = select.selectList(list, info)
			weight = matched.weight
			return matched ? matched.id : Promise.reject()
		})
}

const track = id => {
	const url = `https://www.youtube.com/get_video_info?video_id=${id}&el=detailpage&html5=1`
	return request('GET', url, {}, null, proxy)
		.then(response => response.body())
		.then(body => JSON.parse(parse(body).player_response).streamingData)
		.then(streamingData => {
			const stream = streamingData.formats.concat(streamingData.adaptiveFormats)
				.find(format => format.itag === 140)
			// .filter(format => [249, 250, 140, 251].includes(format.itag)) // NetaseMusic PC client do not support webm format
			// .sort((a, b) => b.bitrate - a.bitrate)[0]
			const target = parse(stream.signatureCipher)
			return stream.url || (target.sp.includes('sig') ? cache(signature, undefined, 24 * 60 * 60 * 1000).then(sign => ({
				url: target.url + '&sig=' + sign(target.s),
				weight: weight
			})) : {
				url: target.url,
				weight: weight
			})
		})
		.catch(() => insure().youtube.track(id))
}

const check = info => cache(key ? apiSearch : search, info).then(track)

module.exports = {
	check,
	track
}