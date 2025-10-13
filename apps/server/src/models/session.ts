import { type Player } from './player';

export type SessionStatus = 'waiting_for_friend' | 'waiting_for_boat_placements' | 'ready_to_play';

interface SessionBase {
	id: string;
	slug: string;
	status: SessionStatus;
	owner: Player;
	friend: Player | null;
}

interface SessionCreated extends SessionBase {
	status: 'waiting_for_friend';
	friend: null;
}

interface SessionWaitingForBoats extends SessionBase {
	status: 'waiting_for_boat_placements';
	friend: Player;
}

interface SessionReadyToPlay extends SessionBase {
	status: 'ready_to_play';
	friend: Player;
}

export type Session = SessionCreated | SessionWaitingForBoats | SessionReadyToPlay;
