CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  v2ex_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  city TEXT,
  tech_stack TEXT,
  is_remote INTEGER DEFAULT 0,
  salary TEXT,
  fetched_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);
CREATE INDEX IF NOT EXISTS idx_jobs_remote ON jobs(is_remote);
