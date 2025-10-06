export const API_BASE_URL: string | undefined = import.meta.env.VITE_SERVER_BASE_URL;
if (!API_BASE_URL) {
	throw new Error('VITE_SERVER_BASE_URL is not defined.');
}

export const WS_BASE_URL: string = API_BASE_URL.replace(/^http/, 'ws');
