import type { Player } from './player';

export type SessionStatus = 'waiting_for_friend' | 'waiting_for_boat_placements' | 'ready_to_play';

export interface Session {
	id: string;
	status: SessionStatus;
	owner: Player;
	friend: Player | null;
}
