import 'dotenv/config';

interface Config {
	allowedOrigins: string[];
	port: number;
}

function initConfig(): Config {
	const allowedOrigins: string | undefined = process.env.ALLOWED_ORIGINS;
	if (!allowedOrigins) {
		throw new Error('ALLOWED_ORIGINS environment variable is not set');
	}

	const port = process.env.PORT;
	if (!port) {
		throw new Error('PORT environment variable is not set');
	}

	return {
		allowedOrigins: allowedOrigins.split(','),
		port: parseInt(port, 10),
	};
}

export const config: Config = initConfig();
