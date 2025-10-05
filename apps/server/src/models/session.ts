import { Player } from './player';

export interface Session {
	id: string;
	owner: Player;
	friend: Player | null;
}
