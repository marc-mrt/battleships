import express, { Application } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config } from './config';
import * as HealthcheckController from './controllers/healthcheck';
import * as SessionController from './controllers/session';
import { errorHandler } from './middlwares/error';
import { setupWebSocketServer } from './controllers/websocket';
import cookieParser from 'cookie-parser';

function run(): void {
	try {
		const app: Application = express();

		app.use(
			cors({
				origin: config.allowedOrigins,
				credentials: true,
			}),
		);
		app.use(express.json());
		app.use(cookieParser());

		app.get('/healthcheck', HealthcheckController.healthcheck);
		app.get('/sessions', SessionController.getCurrentSession);
		app.post('/sessions', SessionController.createSession);
		app.post('/sessions/:slug/join', SessionController.joinSession);

		app.use(errorHandler);

		const server = createServer(app);
		const wss = new WebSocketServer({ server });

		setupWebSocketServer(wss);

		server.listen(config.port, () => {
			console.log(`Server is running on http://localhost:${config.port}`);
		});
	} catch (e) {
		console.error('Failed to start server:', e);
	}
}

run();
