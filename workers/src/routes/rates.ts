import { FREDService, MortgageRateSeries } from '../services/fred';

export interface RatesRouteContext {
  fredService: FREDService;
}

export async function handleGetRates(
  request: Request,
  ctx: RatesRouteContext
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const rateType = url.searchParams.get('type') as '30yr' | '15yr' | 'all' | null;

    if (rateType === '30yr') {
      const rate = await ctx.fredService.getCurrentRate('MORTGAGE30US');
      return Response.json({
        type: '30yr',
        rate,
        asOf: new Date().toISOString(),
      });
    }

    if (rateType === '15yr') {
      const rate = await ctx.fredService.getCurrentRate('MORTGAGE15US');
      return Response.json({
        type: '15yr',
        rate,
        asOf: new Date().toISOString(),
      });
    }

    // Default: return all rates
    const rates = await ctx.fredService.getCurrentRates();
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
}

export async function handleGetRateHistory(
  request: Request,
  ctx: RatesRouteContext
): Promise<Response> {
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

    const history = await ctx.fredService.getRateHistory(series, startDate, endDate);

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
}
