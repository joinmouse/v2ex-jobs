interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
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
  const queryParams = [...params, limit, offset];

  const { results } = await context.env.DB.prepare(sql).bind(...queryParams).all();

  const countResult = await context.env.DB.prepare(`SELECT COUNT(*) as total FROM jobs ${where}`).bind(...params).first<{ total: number }>();

  return Response.json({
    data: results,
    total: countResult?.total ?? 0,
    page,
    limit,
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
};
