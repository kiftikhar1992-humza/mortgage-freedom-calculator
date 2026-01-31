import { CacheService } from '../../_shared/services/cache';
import { FREDService } from '../../_shared/services/fred';

interface Env {
  FRED_CACHE: KVNamespace;
  FRED_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const rateType = url.searchParams.get('type') as '30yr' | '15yr' | 'all' | null;

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
      { error: 'Failed to fetch mortgage rates' },
      { status: 500 }
    );
  }
};
