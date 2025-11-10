import * as API from '../../api';
import type { ClientMessage, ServerMessage, GameState } from 'game-messages';
import type { SessionStatus } from '../../models/session';
import { getConnectionManager, type ConnectionManager } from './connection-manager.svelte';
import { handleMessage } from './message-handler';
import {
	createUninitializedState,
	createLoadingState,
	buildStateFromCreatedSession,
	buildStateFromJoinedSession,
	buildStateFromReconnection,
} from './state-builder';

export interface Metadata {
	session: {
		slug: string;
		status: SessionStatus;
	};
	player: {
		id: string;
		username: string;
	};
	opponent: {
		id: string;
		username: string;
	} | null;
}

export type State =
	| { status: 'uninitialized' }
	| { status: 'loading' }
	| { status: 'ready'; meta: Metadata; game: GameState | null };

function isStateReady(
	state: State,
): state is { status: 'ready'; meta: Metadata; game: GameState | null } {
	return state.status === 'ready';
}

function getPlayerFromState(state: State) {
	return isStateReady(state) ? state.meta.player : null;
}

function getOpponentFromState(state: State) {
	return isStateReady(state) ? state.meta.opponent : null;
}

function getSessionFromState(state: State) {
	return isStateReady(state) ? state.meta.session : null;
}

function getGameFromState(state: State) {
	return isStateReady(state) ? state.game : null;
}

class AppStore {
	private unsubscribe: (() => void) | null = null;
	private state = $state<State>({ status: 'uninitialized' });

	get player() {
		return getPlayerFromState(this.state);
	}

	get opponent() {
		return getOpponentFromState(this.state);
	}

	get session() {
		return getSessionFromState(this.state);
	}

	get game() {
		return getGameFromState(this.state);
	}

	constructor(
		private connectionManager: ConnectionManager = getConnectionManager(),
		private api: typeof API = API,
	) {
		const boundHandler = this.handleIncomingMessage.bind(this);
		this.unsubscribe = this.connectionManager.onMessage(boundHandler);
	}

	private async connectAndSetState(newState: State): Promise<void> {
		await this.connectionManager.connect();
		this.state = newState;
	}

	private handleApiError(error: string): never {
		this.state = createUninitializedState();
		throw new Error(error);
	}

	private handleConnectionError(error: unknown): never {
		this.state = createUninitializedState();
		throw error;
	}

	public async createSession(payload: { username: string }) {
		this.state = createLoadingState();

		const result = await this.api.createSession(payload);

		if (!result.success) {
			this.handleApiError(result.error);
		}

		try {
			const newState = buildStateFromCreatedSession(result.value);
			await this.connectAndSetState(newState);
		} catch (error) {
			this.handleConnectionError(error);
		}
	}

	public async joinSession(payload: { username: string; slug: string }) {
		this.state = createLoadingState();

		const result = await this.api.joinSession(payload);

		if (!result.success) {
			this.handleApiError(result.error);
		}

		const newState = buildStateFromJoinedSession(result.value);
		if (newState.status === 'uninitialized') {
			this.state = newState;
			throw new Error('Failed to find player in session');
		}

		try {
			await this.connectAndSetState(newState);
		} catch (error) {
			this.handleConnectionError(error);
		}
	}

	private logReconnectionError(error: unknown): void {
		console.error('Reconnection failed:', error);
	}

	public async attemptReconnect() {
		try {
			const result = await this.api.getSession();

			if (!result.success) {
				this.logReconnectionError(result.error);
				return;
			}

			const session = result.value;
			if (session == null) {
				return;
			}

			const newState = buildStateFromReconnection(session);
			await this.connectAndSetState(newState);
		} catch (error) {
			this.logReconnectionError(error);
		}
	}

	private handleIncomingMessage(message: ServerMessage): void {
		const newState = handleMessage(this.state, message);
		this.state = newState;
	}

	sendAction(action: ClientMessage): void {
		this.connectionManager.send(action);
	}

	destroy(): void {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
		this.connectionManager.disconnect();
	}
}

export const appStore: AppStore = new AppStore();
