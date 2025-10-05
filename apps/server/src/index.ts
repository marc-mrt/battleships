import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config';
import * as HealthcheckController from './controllers/healthcheck';

function run() {
	try {
		const app: Application = express();

		app.use(
			cors({
				origin: config.allowedOrigins,
			}),
		);

		app.get('/healthcheck', HealthcheckController.healthcheck);

		app.listen(config.port, () => {
			console.log(`Server is running on http://localhost:${config.port}`);
		});
	} catch (e) {
		console.error('Failed to start server:', e);
	}
}

run();
