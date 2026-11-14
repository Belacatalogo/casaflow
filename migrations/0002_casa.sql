CREATE TABLE IF NOT EXISTS casa_home (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  snapshot JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS casa_member (
  user_id TEXT PRIMARY KEY,
  home_id TEXT NOT NULL REFERENCES casa_home (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'kitchen'))
);

CREATE INDEX IF NOT EXISTS casa_member_home_idx ON casa_member (home_id);
