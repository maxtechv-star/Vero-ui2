
/*
  base    : https://y2mate.nu
  update  : 12 september 2025
  by      : wolep
  node    : v24.5.0
  note    : buat download mp3, mp4 dari
            youtube biasa, youtube short
            dan youtube music
            support esm dan cjs
            skrep nya kadang ku cek ya
*/

const fetch = require('node-fetch'); // Add node-fetch for Node.js compatibility

const y2mate = {
    get baseHeaders() {
        return {
            'accept-encoding': 'gzip, deflate, br, zstd',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    },

    get url() {
        return {
            origin: 'https://y2mate.nu'
        }
    },

    extractVideoId: function (fV) {
        let v
        if (fV.indexOf('youtu.be') > -1) {
            v = /\/([a-zA-Z0-9\-\_]{11})/.exec(fV);
        } else if (fV.indexOf('youtube.com') > -1) {
            if (fV.indexOf('/shorts/') > -1) {
                v = /\/([a-zA-Z0-9\-\_]{11})/.exec(fV);
            } else {
                v = /v\=([a-zA-Z0-9\-\_]{11})/.exec(fV);
            }
        }
        const result = v?.[1]
        if (!result) throw Error(`Failed to extract video ID from URL`)
        return result
    },

    getInitUrl: async function () {
        try {
            const r1 = await fetch(this.url.origin, { headers: this.baseHeaders })
            console.log('Hit homepage')

            const html = await r1.text()
            const jsPath = html.match(/<script src="(.+?)"/)?.[1]
            const jsUrl = this.url.origin + jsPath

            const r2 = await fetch(jsUrl, { headers: this.baseHeaders })
            console.log('Hit JS file')
            const js = await r2.text()
            
            // Find gB
            const gB_m = js.match(/gB=(.+?),gD/)?.[1]
            const gB = eval(gB_m)

            // Find gC
            const html_m = html.match(/<script>(.+?)<\/script>/)?.[1]
            const hiddenGc = eval(html_m + "gC")
            const gC = Object.fromEntries(Object.getOwnPropertyNames(hiddenGc).map(key => [key, hiddenGc[key]]))

            // Decoding functions
            const decodeBin = (d) => d.split(' ').map(v => parseInt(v, 2))
            const decodeHex = (d) => d.match(/0x[a-fA-F0-9]{2}/g).map(v => String.fromCharCode(v)).join("")
            
            function authorization() {
                var dec = decodeBin(gC.d(1)[0]);
                var k = '';
                for (var i = 0; i < dec.length; i++) k += (gC.d(2)[0] > 0) ? Buffer.from(gC.d(1)[1], 'base64').toString().split('').reverse().join('')[(dec[i] - gC.d(2)[1])] : Buffer.from(gC.d(1)[1], 'base64').toString()[(dec[i] - gC.d(2)[1])];
                if (gC.d(2)[2] > 0) k = k.substring(0, gC.d(2)[2]);
                switch (gC.d(2)[3]) {
                    case 0:
                        return Buffer.from(k + '_' + decodeHex(gC.d(3)[0])).toString('base64');
                    case 1:
                        return Buffer.from(k.toLowerCase() + '_' + decodeHex(gC.d(3)[0])).toString('base64');
                    case 2:
                        return Buffer.from(k.toUpperCase() + '_' + decodeHex(gC.d(3)[0])).toString('base64');
                }
            }

            const api_m = js.matchAll(/e.open\("GET",(.+?),/g)
            if(!api_m) throw Error ('Failed to get API URL match')
            const apiUrl = eval(Array.from(api_m)[1][1])
            return apiUrl
        } catch (e) {
            throw new Error('getApiUrl function failed: ' + e.message)
        }
    },

    download: async function (url, f = 'mp3') {
        // Validate format
        if (!/^mp3|mp4$/.test(f)) throw Error(`Format must be mp3 or mp4`)

        // Extract video id
        const v = this.extractVideoId(url)

        const headers = {
            'referer': this.url.origin,
            ...this.baseHeaders
        }

        // Get init URL
        const initApi = await this.getInitUrl()

        // Hit init API
        const r1 = await fetch(initApi, { headers })
        console.log('Hit init API')

        const j1 = await r1.json()
        const { convertURL } = j1

        // Hit convert URL
        const convertApi = convertURL + '&v=' + v + '&f=' + f + '&_=' + Math.random()
        const r2 = await fetch(convertApi, { headers })
        console.log('Hit convert URL')

        const j2 = await r2.json()
        if (j2.error) {
            throw Error(`Error in convert value: ${JSON.stringify(j2, null, 2)}`)
        }

        if (j2.redirectURL) {
            // Direct download available
            const r3 = await fetch(j2.redirectURL, { headers })
            console.log('Hit redirect URL')
            const j3 = await r3.json()
            const result = {
                title: j3.title,
                downloadURL: j3.downloadURL,
                format: f
            }
            return result
        } else {
            // Need to poll for progress
            let j3b
            do {
                const r3b = await fetch(j2.progressURL, { headers })
                console.log('Hit progress URL')
                j3b = await r3b.json()
                if (j3b.error) throw Error(`Error checking progress: ${JSON.stringify(j3b, null, 2)}`)
                if (j3b.progress == 3) {
                    const result = {
                        title: j3b.title,
                        downloadURL: j2.downloadURL,
                        format: f
                    }
                    return result
                }
                await new Promise(resolve => setTimeout(resolve, 3000))
            } while (j3b.progress != 3)
        }
    }
}

// Export for use with scrape system
module.exports = async (url, format = 'mp3') => {
    try {
        const result = await y2mate.download(url, format);
        return {
            success: true,
            format: result.format,
            title: result.title,
            downloadUrl: result.downloadURL,
            directUrl: result.downloadURL, // For compatibility
            note: 'Use this URL directly to download the file'
        };
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
};
