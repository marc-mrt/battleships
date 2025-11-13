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

interface SessionMeta {
	slug: string;
	status: SessionStatus;
}

interface PlayerMeta {
	id: string;
	username: string;
}

function createSessionMeta(slug: string, status: SessionStatus): SessionMeta {
	return { slug, status };
}

function createPlayerMeta(id: string, username: string): PlayerMeta {
	return { id, username };
}

interface CreateReadyStatePayload {
	session: SessionMeta;
	player: PlayerMeta;
	opponent: PlayerMeta | null;
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

export function extractSessionMeta(session: Session) {
	return createSessionMeta(session.slug, session.status);
}

export function extractPlayerMeta(player: { id: string; username: string }): PlayerMeta {
	return createPlayerMeta(player.id, player.username);
}

function getPlayer(isOwner: boolean) {
	return function extractPlayer(session: Session) {
		return isOwner ? session.owner : session.friend;
	};
}

function getOpponent(isOwner: boolean) {
	return function extractOpponent(session: Session) {
		return isOwner ? session.friend : session.owner;
	};
}

function extractOpponentMeta(opponent: { id: string; username: string } | null): PlayerMeta | null {
	return opponent ? extractPlayerMeta(opponent) : null;
}

interface BuildStateFromSessionPayload {
	session: Session;
	isOwner: boolean;
}

export function buildStateFromSession(payload: BuildStateFromSessionPayload): State {
	const { session, isOwner } = payload;
	const player = getPlayer(isOwner)(session);
	const opponent = getOpponent(isOwner)(session);

	if (!player) {
		return createUninitializedState();
	}

	return createReadyState({
		session: extractSessionMeta(session),
		player: extractPlayerMeta(player),
		opponent: extractOpponentMeta(opponent),
	});
}

export function buildStateFromCreatedSession(session: Session): State {
	return createReadyState({
		session: extractSessionMeta(session),
		player: extractPlayerMeta(session.owner),
		opponent: null,
	});
}

export function buildStateFromJoinedSession(session: Session): State {
	if (!session.friend) {
		return createUninitializedState();
	}

	return createReadyState({
		session: extractSessionMeta(session),
		player: extractPlayerMeta(session.friend),
		opponent: extractPlayerMeta(session.owner),
	});
}

export function buildStateFromReconnection(session: Session): State {
	return createReadyState({
		session: extractSessionMeta(session),
		player: extractPlayerMeta(session.owner),
		opponent: extractOpponentMeta(session.friend),
	});
}
