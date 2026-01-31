import { CacheService } from '../../_shared/services/cache';
import { FREDService, MortgageRateSeries } from '../../_shared/services/fred';

interface Env {
  FRED_CACHE: KVNamespace;
  FRED_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const series = url.searchParams.get('series') as MortgageRateSeries | null;
    const startDate = url.searchParams.get('start');
    const endDate = url.searchParams.get('end') || undefined;

    if (!series || !startDate) {
      return Response.json(
        { error: 'Missing required parameters: series, start' },
        { status: 400 }
      );
    }

    if (series !== 'MORTGAGE30US' && series !== 'MORTGAGE15US') {
      return Response.json(
        { error: 'Invalid series. Use MORTGAGE30US or MORTGAGE15US' },
        { status: 400 }
      );
    }

    const cacheService = new CacheService(env.FRED_CACHE);
    const fredService = new FREDService(env.FRED_API_KEY, cacheService);

    const history = await fredService.getRateHistory(series, startDate, endDate);

    return Response.json({
      series,
      startDate,
      endDate: endDate || 'current',
      data: history,
    });
  } catch (error) {
    console.error('Error fetching rate history:', error);
    return Response.json(
      { error: 'Failed to fetch rate history' },
      { status: 500 }
    );
  }
};
