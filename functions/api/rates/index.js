import { CacheService } from '../../_shared/services/cache.js';
import { FREDService } from '../../_shared/services/fred.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Debug: Check if env vars exist
    if (!env.FRED_API_KEY) {
      return Response.json({ error: 'FRED_API_KEY not set', debug: true }, { status: 500 });
    }
    if (!env.FRED_CACHE) {
      return Response.json({ error: 'FRED_CACHE not bound', debug: true }, { status: 500 });
    }

    const url = new URL(request.url);
    const rateType = url.searchParams.get('type');

    const cacheService = new CacheService(env.FRED_CACHE);
    const fredService = new FREDService(env.FRED_API_KEY, cacheService);

    if (rateType === '30yr') {
      const rate = await fredService.getCurrentRate('MORTGAGE30US');
      return Response.json({
        type: '30yr',
        rate,
        asOf: new Date().toISOString(),
      });
    }

    if (rateType === '15yr') {
      const rate = await fredService.getCurrentRate('MORTGAGE15US');
      return Response.json({
        type: '15yr',
        rate,
        asOf: new Date().toISOString(),
      });
    }

    const rates = await fredService.getCurrentRates();
    return Response.json({
      rates: {
        '30yr': rates.rate30Year,
        '15yr': rates.rate15Year,
      },
      date: rates.date,
      asOf: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching rates:', error);
    return Response.json(
      { error: 'Failed to fetch mortgage rates', message: error.message },
      { status: 500 }
    );
  }
}
