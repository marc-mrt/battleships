import type { Player } from './player';

export type SessionStatus = 'waiting_for_friend' | 'waiting_for_boat_placements' | 'playing';

export interface Session {
	slug: string;
	status: SessionStatus;
	owner: Player;
	friend: Player | null;
}
