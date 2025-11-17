import { type Boat } from './boat';
import { type Player } from './player';
import { type Shot } from './shot';

export type SessionStatus =
	| 'waiting_for_friend'
	| 'waiting_for_boat_placements'
	| 'ready_to_start'
	| 'playing';

interface SessionBase {
	id: string;
	slug: string;
	status: SessionStatus;
	owner: Player;
}

export interface SessionCreated extends SessionBase {
	status: 'waiting_for_friend';
}

export interface SessionWaitingForBoats extends SessionBase {
	status: 'waiting_for_boat_placements';
	friend: Player;
}

export interface SessionReadyToStart extends SessionBase {
	status: 'ready_to_start';
	friend: Player;
}

export interface SessionPlaying extends SessionBase {
	status: 'playing';
	ownerBoats: Boat[];
	friend: Player;
	friendBoats: Boat[];
	currentTurn: Pick<Player, 'id'>;
	shots: Shot[];
}

export function isSessionPlaying(session: Session): session is SessionPlaying {
	return session.status === 'playing' && (session as SessionGameOver).winner == null;
}

export interface SessionGameOver extends SessionPlaying {
	winner: Pick<Player, 'id'>;
}

export function isSessionGameOver(session: Session): session is SessionGameOver {
	return session.status === 'playing' && (session as SessionGameOver).winner != null;
}

export type Session =
	| SessionCreated
	| SessionWaitingForBoats
	| SessionReadyToStart
	| SessionPlaying
	| SessionGameOver;
