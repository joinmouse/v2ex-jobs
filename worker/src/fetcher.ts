import type { V2exTopic } from './types.ts';

const V2EX_API = 'https://www.v2ex.com/api/topics/show.json?node_name=jobs';

export async function fetchV2exJobs(): Promise<V2exTopic[]> {
  const response = await fetch(V2EX_API, {
    headers: {
      'User-Agent': 'v2ex-jobs-worker/0.1',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`V2EX API returned ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('V2EX API response is not an array');
  }

  return data as V2exTopic[];
}
