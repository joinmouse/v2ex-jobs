export interface V2exTopic {
  id: number;
  title: string;
  content: string;
  content_rendered: string;
  replies: number;
  created: number;
  last_touched: number;
  member: {
    username: string;
    avatar_normal: string;
  };
  node: {
    name: string;
    title: string;
  };
}

export interface JobRecord {
  id?: number;
  v2ex_id: number;
  title: string;
  content: string;
  author: string;
  created_at: number;
  city: string | null;
  tech_stack: string; // JSON array
  is_remote: number;
  salary: string | null;
  fetched_at: number;
}

export interface Env {
  DB: D1Database;
}
