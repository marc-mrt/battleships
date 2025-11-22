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

function getWebSocketUrl(baseURL: string): string {
	const urlWithoutPath = baseURL.replace(/\/api$/, '');
	const protocol = getWebSocketProtocol();
	const wsUrl = urlWithoutPath.replace(/^http/, protocol);
	return `${wsUrl}/ws`;
}

export const API_BASE_URL: string = getBaseUrl();

export const WEBSOCKET_BASE_URL: string = getWebSocketUrl(API_BASE_URL);
