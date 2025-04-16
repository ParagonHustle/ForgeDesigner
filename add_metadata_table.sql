-- Create the metadata table for storing key-value pairs
CREATE TABLE IF NOT EXISTS metadata (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  key TEXT NOT NULL,
  value TEXT NOT NULL
);

-- Add an index for faster lookups
CREATE INDEX IF NOT EXISTS metadata_user_id_key_idx ON metadata(user_id, key);