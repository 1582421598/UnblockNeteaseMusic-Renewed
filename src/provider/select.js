const similarity = require('../similarity')

const replaceSpace = (string) => string.replace(/&nbsp;/g, ' ').replace(/nbsp;/g, ' ')

const calcWeight = (song, info) => {
    var weight = 0
    const songName = replaceSpace(song.name.replace(/（\s*cover[:：\s][^）]+）/i, '')
        .replace(/\(\s*cover[:：\s][^\)]+\)/i, '')
        .replace(/（\s*翻自[:：\s][^）]+）/, '')
        .replace(/\(\s*翻自[:：\s][^\)]+\)/, '')).toLowerCase()
    const similarityVaule = similarity.compareTwoStrings(songName, info.name)
    if (similarityVaule === 0) return 0 //歌曲名不相似绝对不一样    
    if (similarityVaule === 1) weight = 0.15
    else weight = similarityVaule / 4

    if (song.artists) {
        var authorName = ''
        if (Array.isArray(song.artists)) {
            song.artists.forEach(artists => {
                authorName = authorName + artists.name.replace(/&nbsp;/g, ' ')
            });
        } else {
            authorName = song.artists.name
        }
        authorName = replaceSpace(authorName).toLowerCase()
        const songName = song.name ? song.name : ''
        info.artists.forEach(artists => {
            const originalName = artists.name.toLowerCase()
            if (authorName.includes(originalName)) weight = weight + 0.1
            else if (songName.includes(originalName)) weight = weight + 0.1
            else weight = weight - 0.1
        })
    }
    if (song.duration) {
        const songLength = Math.abs(song.duration - info.duration)
        if (songLength < 3 * 1e3) weight = weight + 0.1
        else if (songLength < 6 * 1e3) weight = weight + 0.06
        else if (songLength < 9 * 1e3) weight = weight + 0.03
    }
    if (song.playcount) {
        let addweight = song.playcount * 0.00001
        if (addweight > 0.1) addweight = 0.1
        weight += addweight
    }
    return weight.toFixed(2) * 100
}

const selectList = (list, info) => {
    for (let index = 0; index < list.length; index++) {
        list[index].weight = calcWeight(list[index], info)
    }
    return selectArray(list)
}

const selectArray = array => {
    var song = array[0]
    for (let index = 1; index < array.length; index++) {
        const nowSong = array[index];
        if (song.weight < nowSong.weight) song = nowSong
    }
    return song
}

module.exports = {
    selectList,
    selectArray
}

module.exports.ENABLE_FLAC = (process.env.ENABLE_FLAC || '').toLowerCase() === 'true'