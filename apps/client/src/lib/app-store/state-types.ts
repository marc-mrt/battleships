import type { GameState } from 'game-messages';
import type { SessionStatus } from '../../models/session';

export interface SessionMetadata {
	slug: string;
	status: SessionStatus;
}

export interface PlayerMetadata {
	id: string;
	username: string;
	isOwner: boolean;
}

export interface Metadata {
	session: SessionMetadata;
	player: PlayerMetadata;
	opponent: PlayerMetadata | null;
}

export type State =
	| { status: 'uninitialized' }
	| { status: 'loading' }
	| { status: 'ready'; meta: Metadata; game: GameState | null };
