/*
  yt audio video downloader
  base   : https://ogmp3.pro/ | https://ytmp3.ws
  note   : skrep dah jadi, bisa donlot audio dan video
           supported format: 64k, 96k, 128k, 192k, 256k, 320k, 240p, 360p, 480p, 720p, 1080p
  node   : 24.5.0
  update : 11 November 2025, 12:57 wita
  by     : wolep
*/

const yt = {
    url: Object.freeze({
        audio128: 'https://api.apiapi.lat',
        video: 'https://api5.apiapi.lat',
        else: 'https://api3.apiapi.lat',
        referrer: 'https://ogmp3.pro/'
    }),

    encUrl: (string) => string.split('').map(c => c.charCodeAt()).reverse().join(';'),
    xor: (string) => string.split('').map(s => String.fromCharCode(s.charCodeAt() ^ 1)).join(''),
    genRandomHex: () => {
        const hex = '0123456789abcdef'.split('')
        return Array.from({ length: 32 }, _ => hex[Math.floor(Math.random() * hex.length)]).join('')
    },

    init: async function (rpObj) {
        const { apiOrigin, payload } = rpObj
        const { data } = payload
        const api = apiOrigin + '/' + this.genRandomHex() + '/init/' + this.encUrl(this.xor(data)) + '/' + this.genRandomHex() + '/'
        let resp = await fetch(api, {
            method: 'post',
            body: JSON.stringify(payload)
        })
        if (!resp.ok) throw Error(`${resp.status} ${resp.statusText}\n${await resp.text()}`)
        const json = await resp.json()
        //console.log(json)
        return json
    },

    genFileUrl: function (i, pk, rpObj) {
        const { apiOrigin } = rpObj
        const pk_value = pk ? pk + "/" : "";
        const downloadUrl = apiOrigin + "/" + this.genRandomHex() + "/download/" + i + "/" + this.genRandomHex() + "/" + pk_value;
        const result = { downloadUrl }
        return result
    },

    statusCheck: async function (i, pk, rpObj) {
        const { apiOrigin } = rpObj
        let json = {}
        let counter = 0
        do {
            await new Promise(resolve => setTimeout(resolve, 5000))
            counter++
            console.log("pooling ke " + counter + "/100")

            const pk_value = pk ? pk + '/' : ''
            let api = apiOrigin + '/' + this.genRandomHex() + '/status/' + i + '/' + this.genRandomHex() + '/' + pk_value
            const resp = await fetch(api, {
                method: 'post',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: i })
            })
            if (!resp.ok) throw Error(`${resp.status} ${resp.statusText}\n${await resp.text()}`)
            json = await resp.json()
            //console.log(json)
            
            if(counter >=100) throw Error (`pooling mencapai 100 kali, proses dihentikan. gak jelas jir`)
        } while (json.s === "P")
        if (json.s === "E") throw Error('gagal gagal.. nih raw json\n' + JSON.stringify(json, null, 2))
        return this.genFileUrl(i, pk, rpObj)
    },

    download: async function (ytUrl, userFormat = '128k') {
        const rpObj = this.resolvePayload(ytUrl, userFormat)
        const initObj = await this.init(rpObj)
        const { i, pk, s } = initObj
        console.log(`your task id: ${i}`)
        let result = { userFormat }
        if (s === 'C') {
            const wolep = this.genFileUrl(i, pk, rpObj)
            Object.assign(result, wolep)
        } else {
            const wolep = await this.statusCheck(i, pk, rpObj)
            Object.assign(result, wolep)
        }
        return result

    },

    resolvePayload: function (ytUrl, userFormat) {
        const validFormat = ['64k', '96k', '128k', '192k', '256k', '320k', '240p', '360p', '480p', '720p', '1080p']
        if (!validFormat.includes(userFormat)) throw Error(`param format salah. format tersedia: ${validFormat.join(', ')}`)
        if (typeof (ytUrl) !== "string" || !ytUrl.trim().length) throw Error('param youtube url gak boleh kosong')

        let apiOrigin = this.url.audio128 //origin default

        // pemilihan format, mp3quality dan mp4quality
        let data = this.xor(ytUrl) //data xor yturl
        let referer = this.url.referrer
        let format = '0' // 0=audio, default
        let mp3Quality = '128' //quality default
        let mp4Quality = '720' //quality default

        if (userFormat === validFormat[2]) { //128k
            apiOrigin = this.url.audio128
        } else if (/^\d+p$/.test(userFormat)) { // any video
            apiOrigin = this.url.video
            mp4Quality = userFormat.match(/\d+/g)[0]
            format = '1'
        } else {
            apiOrigin = this.url.else
            mp3Quality = userFormat.match(/\d+/g)[0]
        }
        const payload = {
            data,
            format,
            referer,
            mp3Quality,
            mp4Quality,
            "userTimeZone": "-480"
        }
        const result = { apiOrigin, payload }
        return result
    }
}

// Export for use with scrape system
module.exports = async (ytUrl, format = '128k') => {
    try {
        const result = await yt.download(ytUrl, format);
        return {
            success: true,
            format: format,
            downloadUrl: result.downloadUrl,
            directUrl: result.downloadUrl // for compatibility
        };
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
};