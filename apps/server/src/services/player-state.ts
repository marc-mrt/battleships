import { Boat } from '../models/boat';
import { SessionInGame } from '../models/session';
import { Coordinates } from '../models/shot';
import * as ShotDB from '../database/shot';
import * as BoatDB from '../database/boat.ts';
import { sendYourTurnMessage } from '../controllers/websocket.ts';

export class PlayerState {
	public playerId: string;
	private playerBoats: Boat[];
	private opponentState: PlayerState;
	private session: SessionInGame;

	constructor(playerId: string, session: SessionInGame) {
		this.playerId = playerId;
		this.playerBoats = session.owner.id === playerId ? session.ownerBoats : session.friendBoats;
		this.session = session;

		const opponentPlayerId = session.owner.id === playerId ? session.friend.id : session.owner.id;
		this.opponentState = new PlayerState(opponentPlayerId, session);
	}

	public async handleShotFired(coordinates: Coordinates): Promise<void> {
		const alreadyShot: boolean = this.session.shots.some(
			(s) => s.x === coordinates.x && s.y === coordinates.y && s.shooterId === this.playerId,
		);
		if (alreadyShot) {
			throw new Error('Cannot shoot twice at the same coordinates');
		}

		const result = this.opponentState.handleIncomingShot(coordinates);

		await ShotDB.recordShot({
			sessionId: this.session.id,
			shooterId: this.playerId,
			targetId: this.opponentState.playerId,
			x: coordinates.x,
			y: coordinates.y,
			hit: result.hit,
		});

		let nextTurnPlayerId: string;
		if (result.hit) {
			if (result.sunk) {
				await BoatDB.markBoatAsSunk(result.boatId);
			}

			nextTurnPlayerId = result.sunk ? this.opponentState.playerId : this.playerId;
		} else {
			nextTurnPlayerId = this.opponentState.playerId;
		}
		sendYourTurnMessage(nextTurnPlayerId, { sessionId: this.session.id });
	}

	public handleIncomingShot(
		coordinates: Coordinates,
	): { hit: false } | { hit: true; sunk: boolean; boatId: string } {
		const boat: Boat | undefined = this.playerBoats.find(isCoordinateOnBoat(coordinates));
		if (!boat) {
			return { hit: false };
		}

		const previousHits: number = this.session.shots.filter(
			(shot) =>
				shot.hit &&
				shot.targetId === this.playerId &&
				isCoordinateOnBoat({ x: shot.x, y: shot.y })(boat),
		).length;
		const totalHits: number = previousHits + 1;

		const sunk: boolean = totalHits === boat.length;
		return { hit: true, sunk, boatId: boat.id };
	}
}

function isCoordinateOnBoat(coordinates: Coordinates) {
	return (boat: Boat) => {
		const { x, y } = coordinates;
		if (boat.orientation === 'horizontal') {
			return y === boat.startY && x >= boat.startX && x < boat.startX + boat.length;
		} else if (boat.orientation === 'vertical') {
			return x === boat.startX && y >= boat.startY && y < boat.startY + boat.length;
		}
		return false;
	};
}
