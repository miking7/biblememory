-- MySQL schema (optional, if you switch from SQLite)
CREATE TABLE ops (
  seq BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(64) NOT NULL,
  op_id CHAR(36) NOT NULL UNIQUE,
  ts_server BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000),
  ts_client BIGINT,
  entity VARCHAR(32) NOT NULL,
  action VARCHAR(16) NOT NULL,
  data_json JSON NOT NULL,
  KEY idx_ops_user_seq (user_id, seq)
);

CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  api_token VARCHAR(128) UNIQUE NOT NULL
);
