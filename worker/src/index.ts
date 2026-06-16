import type { Env } from './types.ts';
import { fetchV2exJobs } from './fetcher.ts';
import { parseTopic } from './parser.ts';

async function handleCron(env: Env): Promise<void> {
  const topics = await fetchV2exJobs();
  const jobs = topics.map(parseTopic);

  const stmt = env.DB.prepare(`
    INSERT OR IGNORE INTO jobs (v2ex_id, title, content, author, created_at, city, tech_stack, is_remote, salary, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const batch = jobs.map((j) =>
    stmt.bind(j.v2ex_id, j.title, j.content, j.author, j.created_at, j.city, j.tech_stack, j.is_remote, j.salary, j.fetched_at),
  );

  await env.DB.batch(batch);
}

function buildQuery(url: URL): { sql: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const city = url.searchParams.get('city');
  if (city) {
    conditions.push('city = ?');
    params.push(city);
  }

  const tech = url.searchParams.get('tech');
  if (tech) {
    conditions.push('tech_stack LIKE ?');
    params.push(`%${tech}%`);
  }

  const remote = url.searchParams.get('remote');
  if (remote === '1') {
    conditions.push('is_remote = 1');
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
  const offset = (page - 1) * limit;

  const sql = `SELECT id, v2ex_id, title, content, author, created_at, city, tech_stack, is_remote, salary, fetched_at FROM jobs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return { sql, params };
}

async function handleApiJobs(url: URL, env: Env): Promise<Response> {
  const { sql, params } = buildQuery(url);
  const { results } = await env.DB.prepare(sql).bind(...params).all();

  // Get total count for pagination
  const conditions: string[] = [];
  const countParams: unknown[] = [];
  const city = url.searchParams.get('city');
  if (city) { conditions.push('city = ?'); countParams.push(city); }
  const tech = url.searchParams.get('tech');
  if (tech) { conditions.push('tech_stack LIKE ?'); countParams.push(`%${tech}%`); }
  const remote = url.searchParams.get('remote');
  if (remote === '1') { conditions.push('is_remote = 1'); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await env.DB.prepare(`SELECT COUNT(*) as total FROM jobs ${where}`).bind(...countParams).first<{ total: number }>();

  return Response.json({
    data: results,
    total: countResult?.total ?? 0,
    page: Math.max(1, Number(url.searchParams.get('page')) || 1),
    limit: Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20)),
  });
}

async function handleApiFilters(env: Env): Promise<Response> {
  const cities = await env.DB.prepare(
    `SELECT DISTINCT city FROM jobs WHERE city IS NOT NULL ORDER BY city`,
  ).all<{ city: string }>();

  return Response.json({
    cities: cities.results.map((r) => r.city),
  });
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    let response: Response;
    if (url.pathname === '/api/jobs') {
      response = await handleApiJobs(url, env);
    } else if (url.pathname === '/api/filters') {
      response = await handleApiFilters(env);
    } else if (url.pathname === '/api/fetch' && request.method === 'GET') {
      // Manual trigger for testing
      await handleCron(env);
      response = Response.json({ ok: true });
    } else {
      response = new Response('Not Found', { status: 404 });
    }

    // Add CORS headers
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      newHeaders.set(key, value);
    }
    return new Response(response.body, { status: response.status, headers: newHeaders });
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await handleCron(env);
  },
} satisfies ExportedHandler<Env>;
