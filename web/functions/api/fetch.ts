interface Env {
  DB: D1Database;
}

interface V2exTopic {
  id: number;
  title: string;
  content: string;
  member: { username: string };
  created: number;
}

const V2EX_API = 'https://www.v2ex.com/api/topics/show.json?node_name=jobs';

const CITIES = [
  '北京', '上海', '深圳', '广州', '杭州', '成都', '南京', '武汉',
  '西安', '苏州', '厦门', '长沙', '重庆', '天津', '珠海', '东莞',
  'Beijing', 'Shanghai', 'Shenzhen', 'Guangzhou', 'Hangzhou', 'Chengdu',
];

const TECH_KEYWORDS = [
  'React', 'Vue', 'Angular', 'Next.js', 'Nuxt',
  'TypeScript', 'JavaScript', 'Node.js', 'Deno', 'Bun',
  'Go', 'Golang', 'Rust', 'Python', 'Java', 'Kotlin', 'Swift',
  'C++', 'C#', '.NET', 'PHP', 'Ruby', 'Elixir', 'Scala',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'Docker', 'Kubernetes', 'K8s', 'AWS', 'GCP', 'Azure',
  'Flutter', 'React Native', 'iOS', 'Android',
  'AI', 'LLM', 'Machine Learning', 'ML', 'NLP', 'CV',
  'Figma', 'UI', 'UX',
];

const REMOTE_PATTERNS = [
  /远程/i, /remote/i, /wfh/i, /居家/i, /在家办公/i,
  /work\s*from\s*home/i, /fully\s*remote/i,
];

const SALARY_PATTERNS = [
  /(\d+)[kK]\s*[-~～至到]\s*(\d+)[kK]/,
  /(\d+)\s*[-~～至到]\s*(\d+)\s*[万wW]/,
  /月薪\s*(\d+)[kK]?\s*[-~～至到]\s*(\d+)[kK]?/,
  /年薪\s*(\d+)\s*[-~～至到]\s*(\d+)\s*[万wW]?/,
  /(\d+)[kK]\s*[x×]\s*(\d+)/i,
];

function extractCity(text: string): string | null {
  for (const city of CITIES) {
    if (text.includes(city)) return city;
  }
  return null;
}

function extractTechStack(text: string): string[] {
  const found: string[] = [];
  const upper = text.toUpperCase();
  for (const tech of TECH_KEYWORDS) {
    if (upper.includes(tech.toUpperCase())) {
      found.push(tech);
    }
  }
  return [...new Set(found)];
}

function extractIsRemote(text: string): boolean {
  return REMOTE_PATTERNS.some((p) => p.test(text));
}

function extractSalary(text: string): string | null {
  for (const pattern of SALARY_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const response = await fetch(V2EX_API, {
    headers: {
      'User-Agent': 'v2ex-jobs-worker/0.1',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return Response.json({ error: `V2EX API returned ${response.status}` }, { status: 502 });
  }

  const data = await response.json() as V2exTopic[];
  if (!Array.isArray(data)) {
    return Response.json({ error: 'V2EX API response is not an array' }, { status: 502 });
  }

  const stmt = context.env.DB.prepare(`
    INSERT OR IGNORE INTO jobs (v2ex_id, title, content, author, created_at, city, tech_stack, is_remote, salary, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Math.floor(Date.now() / 1000);
  const batch = data.map((topic) => {
    const text = `${topic.title} ${topic.content}`;
    return stmt.bind(
      topic.id,
      topic.title,
      topic.content,
      topic.member.username,
      topic.created,
      extractCity(text),
      JSON.stringify(extractTechStack(text)),
      extractIsRemote(text) ? 1 : 0,
      extractSalary(text),
      now,
    );
  });

  await context.env.DB.batch(batch);

  return Response.json({ ok: true, count: data.length }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
};
