import type { State, PlayerMetadata, SessionMetadata } from './state-types';
import type { Session } from '../../models/session';

export function createUninitializedState(): State {
	return {
		status: 'uninitialized',
	};
}

export function createLoadingState(): State {
	return {
		status: 'loading',
	};
}

interface CreateReadyStatePayload {
	session: SessionMetadata;
	player: PlayerMetadata;
	opponent: PlayerMetadata | null;
}

export function createReadyState(payload: CreateReadyStatePayload): State {
	return {
		status: 'ready',
		meta: {
			session: payload.session,
			player: payload.player,
			opponent: payload.opponent,
		},
		game: null,
	};
}

export function extractSessionMetadata(session: Session): SessionMetadata {
	return {
		slug: session.slug,
		status: session.status,
	};
}

interface PlayerMetadataPayload {
	id: string;
	username: string;
	isOwner: boolean;
}

export function extractPlayerMetadata(payload: PlayerMetadataPayload): PlayerMetadata {
	return {
		id: payload.id,
		username: payload.username,
		isOwner: payload.isOwner,
	};
}

export function extractOpponentMetadata(
	opponent: PlayerMetadataPayload | null,
): PlayerMetadata | null {
	return opponent ? extractPlayerMetadata(opponent) : null;
}

export function buildStateFromSession(session: Session): State {
	return createReadyState({
		session: extractSessionMetadata(session),
		player: extractPlayerMetadata(session.player),
		opponent: extractOpponentMetadata(session.opponent),
	});
}
