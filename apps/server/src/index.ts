import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config';
import * as HealthcheckController from './controllers/healthcheck';
import * as SessionController from './controllers/session';
import { errorHandler } from './middlwares/error';

function run() {
	try {
		const app: Application = express();

		app.use(
			cors({
				origin: config.allowedOrigins,
			}),
		);
		app.use(express.json());

		app.get('/healthcheck', HealthcheckController.healthcheck);
		app.post('/sessions', SessionController.createSession);

		app.use(errorHandler);

		app.listen(config.port, () => {
			console.log(`Server is running on http://localhost:${config.port}`);
		});
	} catch (e) {
		console.error('Failed to start server:', e);
	}
}

run();
