function getApiBaseUrl(): URL {
	const urlRaw = import.meta.env.VITE_SERVER_BASE_URL;
	if (!urlRaw) {
		throw new Error('VITE_SERVER_BASE_URL is not defined.');
	}

	const url = new URL(urlRaw);
	if (!url.protocol || !url.host) {
		throw new Error(`Invalid VITE_SERVER_BASE_URL: ${urlRaw}`);
	}

	return url;
}

function getWebSocketProtocol(protocol: string): string {
	return protocol === 'https:' ? 'wss' : 'ws';
}

function getWebSocketUrl(apiBaseURL: URL): URL {
	const protocol = getWebSocketProtocol(apiBaseURL.protocol);
	const host = apiBaseURL.host;
	const path = 'ws';

	const url = new URL(`${protocol}://${host}/${path}`);
	return url;
}

export const API_BASE_URL: URL = getApiBaseUrl();

export const WEBSOCKET_BASE_URL: URL = getWebSocketUrl(API_BASE_URL);
