import type { State } from './store.svelte';
import type { Session, SessionStatus } from '../../models/session';

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

function createSessionMeta(slug: string, status: SessionStatus) {
	return { slug, status };
}

function createPlayerMeta(id: string, username: string) {
	return { id, username };
}

export function createReadyState(
	session: { slug: string; status: SessionStatus },
	player: { id: string; username: string },
	opponent: { id: string; username: string } | null,
): State {
	return {
		status: 'ready',
		meta: { session, player, opponent },
		game: null,
	};
}

export function extractSessionMeta(session: Session) {
	return createSessionMeta(session.slug, session.status);
}

export function extractPlayerMeta(player: { id: string; username: string }) {
	return createPlayerMeta(player.id, player.username);
}

function getPlayer(session: Session, isOwner: boolean) {
	return isOwner ? session.owner : session.friend;
}

function getOpponent(session: Session, isOwner: boolean) {
	return isOwner ? session.friend : session.owner;
}

function extractOpponentMeta(opponent: { id: string; username: string } | null) {
	return opponent ? extractPlayerMeta(opponent) : null;
}

export function buildStateFromSession(session: Session, isOwner: boolean): State {
	const player = getPlayer(session, isOwner);
	const opponent = getOpponent(session, isOwner);

	if (!player) {
		return createUninitializedState();
	}

	return createReadyState(
		extractSessionMeta(session),
		extractPlayerMeta(player),
		extractOpponentMeta(opponent),
	);
}

export function buildStateFromCreatedSession(session: Session): State {
	return createReadyState(extractSessionMeta(session), extractPlayerMeta(session.owner), null);
}

export function buildStateFromJoinedSession(session: Session): State {
	if (!session.friend) {
		return createUninitializedState();
	}

	return createReadyState(
		extractSessionMeta(session),
		extractPlayerMeta(session.friend),
		extractPlayerMeta(session.owner),
	);
}

export function buildStateFromReconnection(session: Session): State {
	return createReadyState(
		extractSessionMeta(session),
		extractPlayerMeta(session.owner),
		extractOpponentMeta(session.friend),
	);
}
