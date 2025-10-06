import type { Player } from './player';

export type SessionStatus = 'waiting_for_friend' | 'all_players_joined';

export interface Session {
	id: string;
	status: SessionStatus;
	owner: Player;
	friend: Player | null;
}
