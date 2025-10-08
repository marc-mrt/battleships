CREATE TABLE IF NOT EXISTS players
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
    username   VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
    owner_id   UUID UNIQUE NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    friend_id  UUID UNIQUE REFERENCES players (id) ON DELETE SET NULL
);

CREATE INDEX idx_sessions_owner ON sessions (owner_id);
CREATE INDEX idx_sessions_friend ON sessions (friend_id);

CREATE TABLE IF NOT EXISTS boat_placements
(
    id          VARCHAR(255) PRIMARY KEY NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    player_id   UUID                     NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    start_x     INTEGER                  NOT NULL CHECK (start_x >= 0 AND start_x <= 9),
    start_y     INTEGER                  NOT NULL CHECK (start_y >= 0 AND start_y <= 9),
    length      INTEGER                  NOT NULL CHECK (length >= 1 AND length <= 5),
    orientation VARCHAR(10)              NOT NULL CHECK (orientation IN ('horizontal', 'vertical'))
);

CREATE INDEX idx_boat_placements_player ON boat_placements (player_id);
