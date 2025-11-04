-- SQLite schema for Bible Memory App
-- Based on oplog pattern with enhancements for authentication

-- Users table (proper auth system)
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,           -- UUID v4
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,        -- bcrypt/argon2
  created_at INTEGER NOT NULL,        -- Epoch ms
  last_login_at INTEGER,              -- Epoch ms
  is_active INTEGER DEFAULT 1         -- Boolean flag
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- API Tokens (simple token-based auth)
CREATE TABLE IF NOT EXISTS tokens (
  token TEXT PRIMARY KEY,             -- 64-char hex string (32 bytes)
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,        -- Epoch ms
  last_used_at INTEGER,               -- Epoch ms - for tracking activity
  revoked_at INTEGER,                 -- Epoch ms - NULL if active
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_revoked ON tokens(revoked_at);

-- Operation log (source of truth - from oplog pattern)
CREATE TABLE IF NOT EXISTS ops (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,  -- Monotonic sequence
  user_id TEXT NOT NULL,
  op_id TEXT UNIQUE NOT NULL,             -- UUID v4 from client
  ts_client INTEGER NOT NULL,             -- Epoch ms - client timestamp
  ts_server INTEGER NOT NULL,             -- Epoch ms - server timestamp
  entity TEXT NOT NULL,                   -- "verse", "review", "setting"
  action TEXT NOT NULL,                   -- "add", "set", "patch", "delete"
  data_json TEXT NOT NULL,                -- JSON payload
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ops_user_seq ON ops(user_id, seq);
CREATE INDEX IF NOT EXISTS idx_ops_op_id ON ops(op_id);
CREATE INDEX IF NOT EXISTS idx_ops_entity ON ops(entity);

-- View for current verses (latest state)
CREATE VIEW IF NOT EXISTS current_verses AS
  SELECT 
    user_id,
    json_extract(data_json, '$.id') as verse_id,
    json_extract(data_json, '$.reference') as reference,
    json_extract(data_json, '$.refSort') as ref_sort,
    json_extract(data_json, '$.content') as content,
    json_extract(data_json, '$.translation') as translation,
    json_extract(data_json, '$.reviewCat') as review_cat,
    json_extract(data_json, '$.startedAt') as started_at,
    json_extract(data_json, '$.tags') as tags,
    json_extract(data_json, '$.favorite') as favorite,
    ts_server as updated_at
  FROM ops
  WHERE entity = 'verse'
    AND action != 'delete'
    AND seq = (
      SELECT MAX(seq)
      FROM ops o2
      WHERE o2.user_id = ops.user_id
        AND o2.entity = 'verse'
        AND json_extract(o2.data_json, '$.id') = json_extract(ops.data_json, '$.id')
    );

-- View for reviews (derived from ops)
CREATE VIEW IF NOT EXISTS reviews_view AS
  SELECT 
    user_id,
    json_extract(data_json, '$.id') as review_id,
    json_extract(data_json, '$.verseId') as verse_id,
    json_extract(data_json, '$.reviewType') as review_type,
    json_extract(data_json, '$.createdAt') as created_at,
    ts_server
  FROM ops
  WHERE entity = 'review'
    AND action = 'add';

-- View for user stats
CREATE VIEW IF NOT EXISTS user_stats AS
  SELECT 
    user_id,
    COUNT(DISTINCT CASE 
      WHEN entity='verse' AND action != 'delete' 
      THEN json_extract(data_json, '$.id') 
    END) as verse_count,
    COUNT(CASE 
      WHEN entity='review' 
      THEN 1 
    END) as review_count,
    MAX(CASE 
      WHEN entity='review' 
      THEN ts_server 
    END) as last_review_at
  FROM ops
  GROUP BY user_id;
