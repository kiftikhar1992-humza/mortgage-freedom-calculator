import { FREDService } from '../services/fred';

export interface EconomicRouteContext {
  fredService: FREDService;
}

export async function handleGetAffordability(
  request: Request,
  ctx: EconomicRouteContext
): Promise<Response> {
  try {
    const data = await ctx.fredService.getAffordabilityIndex();

    // Affordability index interpretation:
    // - 100 = median income exactly qualifies for median home
    // - > 100 = more affordable (income exceeds qualification)
    // - < 100 = less affordable (income below qualification)

    let interpretation: string;
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

export async function handleGetHomePrices(
  request: Request,
  ctx: EconomicRouteContext
): Promise<Response> {
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

    const data = await ctx.fredService.getHomePriceIndex(months);

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
}
