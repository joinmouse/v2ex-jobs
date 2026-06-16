interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const cities = await context.env.DB.prepare(
    `SELECT DISTINCT city FROM jobs WHERE city IS NOT NULL ORDER BY city`,
  ).all<{ city: string }>();

  return Response.json({
    cities: cities.results.map((r) => r.city),
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
};
