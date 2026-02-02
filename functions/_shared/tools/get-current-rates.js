export const getCurrentRatesDefinition = {
  name: 'get_current_rates',
  description:
    'Fetch the latest 30-year and 15-year fixed mortgage rates from the Federal Reserve. Use this when users ask about current mortgage rates or want to compare rate options.',
  input_schema: {
    type: 'object',
    properties: {
      rate_type: {
        type: 'string',
        enum: ['30yr', '15yr', 'all'],
        description:
          'The type of rate to fetch. "30yr" for 30-year fixed, "15yr" for 15-year fixed, or "all" for both rates.',
      },
    },
    required: [],
  },
};

export async function executeGetCurrentRates(input, fredService) {
  const rateType = input.rate_type || 'all';

  if (rateType === '30yr') {
    const rate = await fredService.getCurrentRate('MORTGAGE30US');
    return JSON.stringify({
      type: '30-year fixed',
      rate: `${rate}%`,
      raw_rate: rate,
    });
  }

  if (rateType === '15yr') {
    const rate = await fredService.getCurrentRate('MORTGAGE15US');
    return JSON.stringify({
      type: '15-year fixed',
      rate: `${rate}%`,
      raw_rate: rate,
    });
  }

  const rates = await fredService.getCurrentRates();
  return JSON.stringify({
    '30_year_fixed': {
      rate: `${rates.rate30Year}%`,
      raw_rate: rates.rate30Year,
    },
    '15_year_fixed': {
      rate: `${rates.rate15Year}%`,
      raw_rate: rates.rate15Year,
    },
    as_of_date: rates.date,
    source: 'Federal Reserve Economic Data (FRED)',
  });
}
