import { CacheService } from '../_shared/services/cache';
import { FREDService } from '../_shared/services/fred';

interface Env {
  FRED_CACHE: KVNamespace;
  FRED_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const monthsParam = url.searchParams.get('months');
    const months = monthsParam ? parseInt(monthsParam) : 12;

    if (isNaN(months) || months < 1 || months > 120) {
      return Response.json(
        { error: 'Invalid months parameter. Must be between 1 and 120.' },
        { status: 400 }
      );
    }

    const cacheService = new CacheService(env.FRED_CACHE);
    const fredService = new FREDService(env.FRED_API_KEY, cacheService);

    const data = await fredService.getHomePriceIndex(months);

    if (data.length < 2) {
      return Response.json({
        series: 'CSUSHPINSA',
        name: 'Case-Shiller U.S. National Home Price Index',
        data,
        change: null,
        changePercent: null,
        asOf: new Date().toISOString(),
      });
    }

    const latest = data[data.length - 1];
    const earliest = data[0];
    const change = latest.value - earliest.value;
    const changePercent = ((change / earliest.value) * 100).toFixed(2);

    return Response.json({
      series: 'CSUSHPINSA',
      name: 'Case-Shiller U.S. National Home Price Index',
      data,
      latest: {
        value: latest.value,
        date: latest.date,
      },
      change: {
        absolute: change,
        percent: parseFloat(changePercent),
        period: `${months} months`,
      },
      asOf: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching home price index:', error);
    return Response.json(
      { error: 'Failed to fetch home price index' },
      { status: 500 }
    );
  }
};
