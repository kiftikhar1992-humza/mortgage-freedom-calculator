import { CacheService } from '../_shared/services/cache.js';
import { FREDService } from '../_shared/services/fred.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const cacheService = new CacheService(env.FRED_CACHE);
    const fredService = new FREDService(env.FRED_API_KEY, cacheService);

    const data = await fredService.getAffordabilityIndex();

    let interpretation;
    if (data.value >= 120) {
      interpretation = 'Very Affordable';
    } else if (data.value >= 100) {
      interpretation = 'Affordable';
    } else if (data.value >= 80) {
      interpretation = 'Somewhat Unaffordable';
    } else {
      interpretation = 'Very Unaffordable';
    }

    return Response.json({
      index: data.value,
      date: data.date,
      interpretation,
      description:
        'The Housing Affordability Index measures whether a typical family earns enough income to qualify for a mortgage on a typical home.',
      asOf: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching affordability index:', error);
    return Response.json(
      { error: 'Failed to fetch affordability index' },
      { status: 500 }
    );
  }
}
