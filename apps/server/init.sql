CREATE TABLE IF NOT EXISTS players
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP        DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id   UUID NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    friend_id  UUID REFERENCES players (id) ON DELETE SET NULL,
    created_at TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP        DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_owner ON sessions (owner_id);
CREATE INDEX idx_sessions_friend ON sessions (friend_id);
