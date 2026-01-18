CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    created_at TEXT DEFAULT (datetime('now')),
    username TEXT NOT NULL,
    wins INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT DEFAULT (datetime('now')),
    slug TEXT UNIQUE NOT NULL,
    owner_id TEXT UNIQUE NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    friend_id TEXT UNIQUE REFERENCES players(id) ON DELETE SET NULL,
    current_turn_id TEXT REFERENCES players(id) ON DELETE SET NULL,
    winner_id TEXT REFERENCES players(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_owner ON sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_friend ON sessions(friend_id);

CREATE TABLE IF NOT EXISTS boats (
    id TEXT PRIMARY KEY NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    start_x INTEGER NOT NULL CHECK (start_x >= 0 AND start_x <= 9),
    start_y INTEGER NOT NULL CHECK (start_y >= 0 AND start_y <= 9),
    length INTEGER NOT NULL CHECK (length >= 1 AND length <= 5),
    orientation TEXT NOT NULL CHECK (orientation IN ('horizontal', 'vertical')),
    sunk INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_boats_player ON boats(player_id);

CREATE TABLE IF NOT EXISTS shots (
    id TEXT PRIMARY KEY,
    created_at TEXT DEFAULT (datetime('now')),
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    shooter_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    x INTEGER NOT NULL CHECK (x >= 0 AND x <= 9),
    y INTEGER NOT NULL CHECK (y >= 0 AND y <= 9),
    hit INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shots_session ON shots(session_id);
CREATE INDEX IF NOT EXISTS idx_shots_shooter ON shots(shooter_id);
CREATE INDEX IF NOT EXISTS idx_shots_target ON shots(target_id);
