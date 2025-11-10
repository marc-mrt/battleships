function getBaseUrl(): string {
	const url = import.meta.env.VITE_SERVER_BASE_URL;
	if (!url) {
		throw new Error('VITE_SERVER_BASE_URL is not defined.');
	}
	return url;
}

function isHttps(): boolean {
	return window.location.protocol === 'https:';
}

function getWebSocketProtocol(): string {
	return isHttps() ? 'wss' : 'ws';
}

function convertToWebSocketUrl(httpUrl: string): string {
	return httpUrl.replace(/^http/, getWebSocketProtocol());
}

export const API_BASE_URL: string = getBaseUrl();

export const WEBSOCKET_BASE_URL: string = convertToWebSocketUrl(API_BASE_URL);
