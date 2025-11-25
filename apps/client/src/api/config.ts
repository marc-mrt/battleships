function getApiBaseUrlFromEnv(): URL {
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

function removeSlashes(path: string): string {
	return path.replace(/\/$/, '').replace(/\/$/, '').replace(/^\//, '');
}

export function getApiURL(path: string): string {
	const apiBaseURL = getApiBaseUrlFromEnv();
	const fullPath = [apiBaseURL.pathname, path].map(removeSlashes).join('/');
	const url = new URL(fullPath, apiBaseURL);
	return url.toString();
}

function getWebSocketProtocol(protocol: string): string {
	return protocol === 'https:' ? 'wss' : 'ws';
}

function getWebSocketUrl(): URL {
	const apiBaseURL = getApiBaseUrlFromEnv();
	const protocol = getWebSocketProtocol(apiBaseURL.protocol);
	const host = apiBaseURL.host;
	const path = 'ws';

	const url = new URL(`${protocol}://${host}/${path}`);
	return url;
}

export const WEBSOCKET_BASE_URL: URL = getWebSocketUrl();
