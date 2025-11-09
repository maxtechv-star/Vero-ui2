const WebSocket = require('ws');

async function ss2code(imageBuffer) {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket('wss://imagetoappv2.ngrok.app/generate-code');
		let finalCode = '';
        
		ws.on('open', () => {
			console.log('Connect to WebSocket');
			ws.send(JSON.stringify({
				generationType: 'create',
				image: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
				inputMode: 'image',
				openAiApiKey: null,
				openAiBaseURL: null,
				anthropicApiKey: null,
				screenshotOneApiKey: null,
				isImageGenerationEnabled: true,
				editorTheme: 'cobalt',
				generatedCodeConfig: 'html_tailwind',
				codeGenerationModel: 'gpt-4o-2024-05-13',
				isTermOfServiceAccepted: false
			}));
		});

		ws.on('message', (message) => {
			const response = JSON.parse(message.toString());
		    if (response.type === 'setCode') {
		        finalCode = response.value;
		    } else if (response.type === 'status') {
		        console.log(response.value);
		    }
		});

		ws.on('close', () => {
			console.log('WebSocket connection closed');
			resolve(finalCode.trim());
		});

		ws.on('error', (error) => {
			reject(new Error(error.message || 'No result found.'));
		});
	});
}

module.exports = ss2code;