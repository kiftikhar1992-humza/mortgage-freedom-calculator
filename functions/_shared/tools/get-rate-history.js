export const getRateHistoryDefinition = {
  name: 'get_rate_history',
  description:
    'Fetch historical mortgage rate data for a specific time period. Use this to show rate trends, compare current rates to historical averages, or analyze rate changes over time.',
  input_schema: {
    type: 'object',
    properties: {
      series: {
        type: 'string',
        enum: ['MORTGAGE30US', 'MORTGAGE15US'],
        description:
          'The FRED series ID. MORTGAGE30US for 30-year rates, MORTGAGE15US for 15-year rates.',
      },
      start_date: {
        type: 'string',
        description: 'Start date for the historical data in YYYY-MM-DD format.',
      },
      end_date: {
        type: 'string',
        description:
          'Optional end date in YYYY-MM-DD format. Defaults to current date if not specified.',
      },
    },
    required: ['series', 'start_date'],
  },
};

export async function executeGetRateHistory(input, fredService) {
  const history = await fredService.getRateHistory(
    input.series,
    input.start_date,
    input.end_date
  );

  if (history.length === 0) {
    return JSON.stringify({
      error: 'No data found for the specified period',
      series: input.series,
      start_date: input.start_date,
      end_date: input.end_date || 'current',
    });
  }

  const rates = history.map(h => h.value);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  const latest = history[history.length - 1];
  const earliest = history[0];
  const change = latest.value - earliest.value;

  return JSON.stringify({
    series: input.series === 'MORTGAGE30US' ? '30-year fixed' : '15-year fixed',
    period: {
      start: input.start_date,
      end: input.end_date || 'current',
    },
    statistics: {
      current: `${latest.value}%`,
      period_start: `${earliest.value}%`,
      change: `${change > 0 ? '+' : ''}${change.toFixed(2)}%`,
      high: `${max}%`,
      low: `${min}%`,
      average: `${avg.toFixed(2)}%`,
    },
    data_points: history.length,
    data: history.slice(-10),
  });
}
