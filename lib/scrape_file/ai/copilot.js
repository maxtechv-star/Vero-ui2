const WebSocket = require('ws')
const axios = require('axios')
const UserAgent = require('user-agents')
const { v4: uuidv4 } = require('uuid')
const crypto = require('crypto')
const FormData = require('form-data')

class Copilot {
    constructor() {
        this.timeout = 30000;
        this.accessToken = null;
        this.refreshToken = 'M.C539_BL2.0.U.-Cu4fDUpc9aqqEVbdNxCPRfLCWUHbEH3tsBaGjA6PBoWnfKKp6yYpLPsmHy692qX0trqIrmz2zK2iFNIRlvEXlfuFLB3pzFgDCDEdpy4sawTTzLR7vev6GX07k3iwU6**0dJZLMCiJFegcDweZauW3xgzhDQDtLLt6FRcvxKMf6vq5RN0vUgBMKIo4UxG8GM1pGa*NaZt46fnDeYwQxJxRP7KLlxZtsf*Pu49!ZqfCJMxexrwrtBugLz2ZFjLzE7suf9NYn!AQ4kpdiaRwxcX!5cVTn!s4O3vJ5uF7B!KwztagysrZPGS4JU*oWWQgSDLrJdsFbvTwky5oVtnKxJzVuVNgnn9Kc0nmfeIMicQZ0N1iJQBvihwLSgiQMOz35aVFEB0xu5QxB3J!RJjo3nOrEyW9Ctn*Taf0r2KUJoD4ey3PNoGoSCy8*K7TJK88EmOhA$$';
        this.clientId = '14638111-3389-403d-b206-a6a71d9f8f16';
        this.scopeId = '140e65af-45d1-4427-bf08-3e7295db6836';
        this.conversationId = null
        
        this.ua = new UserAgent().random().toString()
    }
    
    async refreshAuthentication() {
        const form = new FormData()
        form.append('client_id', this.clientId)
        form.append('redirect_uri', 'https://copilot.microsoft.com')
        form.append('scope', `${this.scopeId}/ChatAI.ReadWrite openid profile offline_access`)
        form.append('grant_type', 'refresh_token')
        form.append('client_info', '1')
        form.append('x-client-SKU', 'msal.js.browser')
        form.append('x-client-VER', '3.26.1')
        form.append('x-ms-lib-capability', 'retry-after, h429')
        form.append('x-client-current-telemetry', '5|61,0,,,|,')
        form.append('x-client-last-telemetry', '5|40|||0,0')
        form.append('client-request-id', uuidv4())
        form.append('refresh_token', this.refreshToken)
        form.append('X-AnchorMailbox', `Oid:00000000-0000-0000-591d-${this._randString(12)}@${uuidv4()}`)

        const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', form, {
            headers: {
                ...form.getHeaders(),
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': 'https://copilot.microsoft.com',
                'Referer': 'https://copilot.microsoft.com/',
                'User-Agent': this.ua,
                'X-Edge-Shopping-Flag': '1',
            }
        })

        if (response.data.token_type !== 'Bearer') throw new Error('Invalid token type')
        if (!response.data.scope.endsWith('/ChatAI.ReadWrite')) throw new Error('Insufficient scope')

        this.refreshToken = response.data.refresh_token
        this.accessToken = response.data.access_token
        
        return {
            refreshToken: this.refreshToken,
            accessToken: this.accessToken,
            expiresIn: response.data.expires_in
        }
    }
    
    _randString(n) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
        return Array.from(crypto.randomBytes(n)).map(x => chars[x % chars.length]).join('')
    }
    
    async createConversation() {
        const response = await axios.post('https://copilot.microsoft.com/c/api/conversations', null, {
            headers: this._getHeaders()
        })
        
        this.conversationId = response.data.id
        return this.conversationId
    }
    
    async chat(message, options = {}) {
        if (!this.conversationId) {
            await this.createConversation()
        }
        
        return new Promise((resolve, reject) => {
            const wsUrl = `wss://copilot.microsoft.com/c/api/chat?api-version=2&features=-,ncedge,edgepagecontext&setflight=-,ncedge,edgepagecontext&ncedge=1${this.accessToken ? `&accessToken=${this.accessToken}` : ''}`
            
            const ws = new WebSocket(wsUrl, {
                headers: {
                    'Origin': 'https://copilot.microsoft.com',
                    'User-Agent': this.ua,
                }
            })

            let text = ''
            let citations = []
            
            const timeout = setTimeout(() => {
                ws.close()
                reject(new Error('Timeout'))
            }, this.timeout)

            ws.on('open', () => {
                ws.send('{"event":"setOptions","supportedFeatures":[],"supportedCards":["local","image","sports","video","ads","safetyHelpLine","quiz","finance"],"ads":{"supportedTypes":["multimedia","product","tourActivity","propertyPromotion","text"]}}')
                ws.send(JSON.stringify({
                    event: 'send',
                    mode: options.mode || 'chat',
                    conversationId: this.conversationId,
                    content: [{ type: 'text', text: message }],
                    context: {}
                }))
            })

            ws.on('message', (data) => {
                try {
                    const parsed = JSON.parse(data.toString())

                    if (parsed.event === 'appendText') {
                        text += parsed.text || ''
                    }

                    if (parsed.event === 'citation') {
                        citations.push({
                            id: parsed.id,
                            title: parsed.title,
                            url: parsed.url,
                            iconUrl: parsed.iconUrl,
                        })
                    }

                    if (parsed.event === 'done') {
                        clearTimeout(timeout)
                        resolve({ text, citations })
                        ws.close()
                    }
                    
                    if (parsed.event === 'error') {
                        clearTimeout(timeout)
                        reject(new Error(parsed.message || 'Chat error'))
                        ws.close()
                    }
                } catch (e) {
                    reject(e)
                }
            })

            ws.on('error', (err) => {
                clearTimeout(timeout)
                reject(err)
            })
        })
    }
    
    _getHeaders() {
        return {
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://copilot.microsoft.com',
            'User-Agent': this.ua,
            'Authorization': this.accessToken ? `Bearer ${this.accessToken}` : undefined,
            'Referer': 'https://copilot.microsoft.com/chats',
            'X-Search-Uilang': 'en-us',
        }
    }
}

module.exports = new Copilot();