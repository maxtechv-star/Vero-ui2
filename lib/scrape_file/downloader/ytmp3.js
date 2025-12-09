
/*
  base    : https://ytmp3.cx
  update  : 21 agustus 2025
  by      : wolep
  node    : v24.5.0
  note    : buat download mp3, mp4 dari
            youtube biasa, youtube short
            dan youtube music
            support esm dan cjs
            skrep nya kadang ku cek ya
*/

const ytmp3 = {
    get baseHeaders() {
        return {
            'accept-encoding': 'gzip, deflate, br, zstd'
        }
    },

    get url() {
        return {
            origin: 'https://ytmp3.cx'
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
        "use strict"
        try {
            const r1 = await fetch(this.url.origin, { headers: this.baseHeaders })
            console.log('Fetching homepage...')

            const html = await r1.text()
            const jsPath = html.match(/<script src="(.+?)"/)?.[1]
            const jsUrl = this.url.origin + jsPath

            const r2 = await fetch(jsUrl, { headers: this.baseHeaders })
            console.log('Fetching JavaScript file...')
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
                for (var i = 0; i < dec.length; i++) k += (gC.d(2)[0] > 0) ? atob(gC.d(1)[1]).split('').reverse().join('')[(dec[i] - gC.d(2)[1])] : atob(gC.d(1)[1])[(dec[i] - gC.d(2)[1])];
                if (gC.d(2)[2] > 0) k = k.substring(0, gC.d(2)[2]);
                switch (gC.d(2)[3]) {
                    case 0:
                        return btoa(k + '_' + decodeHex(gC.d(3)[0]));
                    case 1:
                        return btoa(k.toLowerCase() + '_' + decodeHex(gC.d(3)[0]));
                    case 2:
                        return btoa(k.toUpperCase() + '_' + decodeHex(gC.d(3)[0]));
                }
            }

            const api_m = js.match(/t.open\("GET",(.+?),!/)?.[1]
            const apiUrl = eval(api_m)
            return apiUrl
        } catch (e) {
            throw new Error('Failed to get API URL: ' + e.message)
        }
    },

    download: async function (url, f = 'mp3') {
        // Validation
        if (!/^mp3|mp4$/.test(f)) throw Error(`Invalid format. Use 'mp3' or 'mp4'`)

        // Extract video ID
        const v = this.extractVideoId(url)

        const headers = {
            'referer': this.url.origin,
            ...this.baseHeaders
        }

        // Get initial API URL
        const initApi = await this.getInitUrl()

        // Hit init endpoint
        const r1 = await fetch(initApi, { headers })
        console.log('Hitting init endpoint...')

        const j1 = await r1.json()
        const { convertURL } = j1

        // Hit convert URL
        const convertApi = convertURL + '&v=' + v + '&f=' + f + '&_=' + Math.random()
        const r2 = await fetch(convertApi, { headers })
        console.log('Hitting convert endpoint...')

        const j2 = await r2.json()
        if (j2.error) {
            throw Error(`Convert error: ${JSON.stringify(j2, null, 2)}`)
        }

        if (j2.redirectURL) {
            // Direct redirect case
            const r3 = await fetch(j2.redirectURL, { headers })
            console.log('Following redirect...')
            const j3 = await r3.json()
            const result = {
                success: true,
                title: j3.title,
                downloadURL: j3.downloadURL,
                format: f,
                videoId: v
            }
            return result
        } else {
            // Progress polling case
            let j3b
            let attempts = 0
            const maxAttempts = 10 // Limit to 10 attempts (30 seconds total)
            
            do {
                attempts++
                console.log(`Progress check attempt ${attempts}/${maxAttempts}...`)
                
                const r3b = await fetch(j2.progressURL, { headers })
                j3b = await r3b.json()
                
                if (j3b.error) {
                    throw Error(`Progress check error: ${JSON.stringify(j3b, null, 2)}`)
                }
                
                if (j3b.progress == 3) {
                    const result = {
                        success: true,
                        title: j3b.title || j2.title,
                        downloadURL: j2.downloadURL,
                        format: f,
                        videoId: v
                    }
                    return result
                }
                
                // Wait 3 seconds before next attempt
                await new Promise(resolve => setTimeout(resolve, 3000))
            } while (attempts < maxAttempts)
            
            throw Error('Conversion timed out after maximum attempts')
        }
    }
}

// Export for use with scrape system
module.exports = async (url, format = 'mp3') => {
    try {
        const result = await ytmp3.download(url, format);
        return {
            success: true,
            title: result.title,
            downloadUrl: result.downloadURL,
            format: result.format,
            videoId: result.videoId,
            directUrl: result.downloadURL // for compatibility
        };
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
};
