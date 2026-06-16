import type { V2exTopic, JobRecord } from './types.ts';

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

export function parseTopic(topic: V2exTopic): JobRecord {
  const text = `${topic.title} ${topic.content}`;

  return {
    v2ex_id: topic.id,
    title: topic.title,
    content: topic.content,
    author: topic.member.username,
    created_at: topic.created,
    city: extractCity(text),
    tech_stack: JSON.stringify(extractTechStack(text)),
    is_remote: extractIsRemote(text) ? 1 : 0,
    salary: extractSalary(text),
    fetched_at: Math.floor(Date.now() / 1000),
  };
}
