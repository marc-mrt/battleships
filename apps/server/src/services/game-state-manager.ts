import { Session, SessionInGame } from '../models/session';
import { GameState, LastShot } from 'game-messages';
import { sendNextTurnMessage } from '../controllers/websocket.ts';
import * as BoatDB from '../database/boat.ts';
import * as SessionDB from '../database/session.ts';
import * as ShotDB from '../database/shot';
import { Boat } from '../models/boat';
import { Coordinates, Shot } from '../models/shot';
import * as R from 'ramda';

export class GameStateManager {
	private readonly session: SessionInGame;

	constructor(session: Session) {
		if (session.status !== 'in_game') throw new Error('Game not in progress'); //@TODO(marc-mrt): Handle Errors properly
		this.session = session;
	}

	public async handleShotFired(playerId: string, coordinates: Coordinates): Promise<void> {
		if (this.session.status !== 'in_game') throw new Error('Game not in progress'); //@TODO(marc-mrt): Handle Errors properly
		if (this.session.currentTurn.id !== playerId) throw new Error('Cannot shoot at this time'); //@TODO(marc-mrt): Handle Errors properly

		const alreadyShot: boolean = this.session.shots.some(
			(s) => s.x === coordinates.x && s.y === coordinates.y && s.shooterId === playerId,
		);
		if (alreadyShot) {
			throw new Error('Cannot shoot twice at the same coordinates');
		}

		const targettedPlayerId: string =
			playerId === this.session.owner.id ? this.session.friend.id : this.session.owner.id;

		const result = this.checkIncomingShot(targettedPlayerId, coordinates);

		const shot: Shot = await this.recordShot(playerId, targettedPlayerId, coordinates, result.hit);

		let nextTurnPlayerId: string;
		if (result.hit) {
			if (result.sunk) {
				await this.markBoatAsSunk(result.boatId);
				nextTurnPlayerId = targettedPlayerId;
			} else {
				nextTurnPlayerId = playerId;
			}
		} else {
			nextTurnPlayerId = targettedPlayerId;
		}

		await SessionDB.setCurrentTurn({
			sessionId: this.session.id,
			playerId: nextTurnPlayerId,
		});

		this.broadcastNextTurn(nextTurnPlayerId, {
			...shot,
			sunkBoat: result.hit ? result.sunk : false,
		});
	}

	private async recordShot(
		shooterId: string,
		targetId: string,
		coordinates: Coordinates,
		hit: boolean,
	): Promise<Shot> {
		const recordedShot = await ShotDB.recordShot({
			sessionId: this.session.id,
			shooterId,
			targetId,
			x: coordinates.x,
			y: coordinates.y,
			hit,
		});
		this.session.shots.push(recordedShot);
		return recordedShot;
	}

	private async markBoatAsSunk(boatId: string): Promise<void> {
		const updatedBoat = await BoatDB.markBoatAsSunk(boatId);

		const isBoatInOwnerBoats = R.any(R.propEq(boatId, 'id'), this.session.ownerBoats);
		const boatsToUpdate: Boat[] = isBoatInOwnerBoats
			? this.session.ownerBoats
			: this.session.friendBoats;

		const boatIndex = R.findIndex(R.propEq(boatId, 'id'), boatsToUpdate);
		if (boatIndex !== -1) {
			const updatedBoats = R.update(boatIndex, updatedBoat, boatsToUpdate);
			if (isBoatInOwnerBoats) {
				this.session.ownerBoats = updatedBoats;
			} else {
				this.session.friendBoats = updatedBoats;
			}
		}
	}

	private checkIncomingShot(
		targettedPlayerId: string,
		coordinates: Coordinates,
	): { hit: false } | { hit: true; sunk: boolean; boatId: string } {
		const targettedPlayerBoats: Boat[] =
			this.session.owner.id === targettedPlayerId
				? this.session.ownerBoats
				: this.session.friendBoats;

		const hitBoat: Boat | undefined = targettedPlayerBoats.find(isCoordinateOnBoat(coordinates));
		if (!hitBoat) {
			return { hit: false };
		}

		const previousHits: number = this.session.shots.filter(
			(shot) =>
				shot.hit &&
				shot.targetId === targettedPlayerId &&
				isCoordinateOnBoat({ x: shot.x, y: shot.y })(hitBoat),
		).length;
		const totalHits: number = previousHits + 1;

		const sunk: boolean = totalHits === hitBoat.length;
		return { hit: true, sunk, boatId: hitBoat.id };
	}

	public broadcastNextTurn(nextTurnPlayerId: string, lastShot?: LastShot): void {
		const otherPlayerId: string =
			nextTurnPlayerId === this.session.owner.id ? this.session.friend.id : this.session.owner.id;

		sendNextTurnMessage(
			nextTurnPlayerId,
			this.getStateForPlayer('player_turn', nextTurnPlayerId, lastShot),
		);
		sendNextTurnMessage(
			otherPlayerId,
			this.getStateForPlayer('opponent_turn', otherPlayerId, lastShot),
		);
	}

	private getStateForPlayer(
		turn: GameState['turn'],
		playerId: string,
		lastShot?: LastShot,
	): GameState {
		return {
			turn,
			session: { status: this.session.status },
			lastShot: lastShot ?? null,
			player: {
				boats: this.getPlayerBoats(playerId),
				shots: this.getPlayerShots(playerId),
			},
			opponent: {
				sunkBoats: this.getSunkOpponentBoats(playerId),
				shotsAgainstPlayer: this.getOpponentShotsAgainstMe(playerId),
			},
		};
	}

	private getPlayerBoats(playerId: string): Boat[] {
		return playerId === this.session.owner.id ? this.session.ownerBoats : this.session.friendBoats;
	}

	private getPlayerShots(playerId: string): Shot[] {
		return this.session.shots.filter((shot) => shot.shooterId === playerId);
	}

	private getOpponentShotsAgainstMe(playerId: string): Shot[] {
		return this.session.shots.filter((shot) => shot.targetId === playerId);
	}

	private getSunkOpponentBoats(playerId: string): Boat[] {
		const opponentBoats =
			playerId === this.session.owner.id ? this.session.friendBoats : this.session.ownerBoats;
		return opponentBoats.filter((boat) => boat.sunk);
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
