CREATE TABLE IF NOT EXISTS players
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
    username   VARCHAR(255) NOT NULL,
    wins       INTEGER          DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions
(
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
    slug            VARCHAR(8) UNIQUE NOT NULL,
    owner_id        UUID UNIQUE       NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    friend_id       UUID UNIQUE       REFERENCES players (id) ON DELETE SET NULL,
    current_turn_id UUID              REFERENCES players (id) ON DELETE SET NULL,
    winner_id       UUID              REFERENCES players (id) ON DELETE SET NULL
);

CREATE INDEX idx_sessions_owner ON sessions (owner_id);
CREATE INDEX idx_sessions_friend ON sessions (friend_id);

CREATE TABLE IF NOT EXISTS boats
(
    id          VARCHAR(255) PRIMARY KEY NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    player_id   UUID                     NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    start_x     INTEGER                  NOT NULL CHECK (start_x >= 0 AND start_x <= 9),
    start_y     INTEGER                  NOT NULL CHECK (start_y >= 0 AND start_y <= 9),
    length      INTEGER                  NOT NULL CHECK (length >= 1 AND length <= 5),
    orientation VARCHAR(10)              NOT NULL CHECK (orientation IN ('horizontal', 'vertical')),
    sunk        BOOLEAN   DEFAULT FALSE
);

CREATE INDEX idx_boats_player ON boats (player_id);

CREATE TABLE IF NOT EXISTS shots
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
    session_id UUID    NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    shooter_id UUID    NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    target_id  UUID    NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    x          INTEGER NOT NULL CHECK (x >= 0 AND x <= 9),
    y          INTEGER NOT NULL CHECK (y >= 0 AND y <= 9),
    hit        BOOLEAN NOT NULL
);

CREATE INDEX idx_shots_session ON shots (session_id);
CREATE INDEX idx_shots_shooter ON shots (shooter_id);
CREATE INDEX idx_shots_target ON shots (target_id);
