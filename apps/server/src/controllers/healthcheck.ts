import type { Request, Response } from 'express';

export function healthcheck(_: Request, response: Response) {
	response.send({ status: 'ok' });
}
