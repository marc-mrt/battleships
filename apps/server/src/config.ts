import 'dotenv/config';

interface Config {
	allowedOrigins: string[];
	port: number;
	databaseConnectionString: string;
}

interface EnvVariable {
	key: string;
	value: string | undefined;
}

function getEnvVariable(key: string): EnvVariable {
	return {
		key,
		value: process.env[key],
	};
}

function validateEnvVariable(envVar: EnvVariable): string {
	if (!envVar.value) {
		throw new Error(`${envVar.key} environment variable is not set`);
	}
	return envVar.value;
}

function getRequiredEnvVariable(key: string): string {
	const envVar = getEnvVariable(key);
	return validateEnvVariable(envVar);
}

function parseAllowedOrigins(origins: string): string[] {
	return origins.split(',').map(trimString);
}

function trimString(value: string): string {
	return value.trim();
}

function parsePort(portString: string): number {
	const port = parseInt(portString, 10);
	if (isNaN(port) || port <= 0 || port > 65535) {
		throw new Error(`Invalid PORT value: ${portString}. Must be a number between 1 and 65535`);
	}
	return port;
}

function validateDatabaseConnectionString(connectionString: string): string {
	if (connectionString.length === 0) {
		throw new Error('DATABASE_CONNECTION_STRING cannot be empty');
	}
	return connectionString;
}

function initConfig(): Config {
	const allowedOriginsRaw = getRequiredEnvVariable('ALLOWED_ORIGINS');
	const portRaw = getRequiredEnvVariable('PORT');
	const databaseConnectionString = getRequiredEnvVariable('DATABASE_CONNECTION_STRING');

	return {
		allowedOrigins: parseAllowedOrigins(allowedOriginsRaw),
		port: parsePort(portRaw),
		databaseConnectionString: validateDatabaseConnectionString(databaseConnectionString),
	};
}

export const config: Config = initConfig();
