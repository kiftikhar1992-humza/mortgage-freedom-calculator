import { FREDService } from '../services/fred';

export const getAffordabilityDefinition = {
  name: 'get_affordability_index',
  description:
    'Get the current Housing Affordability Index, which measures whether a typical family earns enough income to qualify for a mortgage on a typical home. An index above 100 means housing is more affordable.',
  input_schema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

export async function executeGetAffordability(
  fredService: FREDService
): Promise<string> {
  const data = await fredService.getAffordabilityIndex();

  let interpretation: string;
  let explanation: string;

  if (data.value >= 140) {
    interpretation = 'Very Affordable';
    explanation =
      'The median family income is significantly higher than needed to qualify for a median-priced home.';
  } else if (data.value >= 120) {
    interpretation = 'Affordable';
    explanation =
      'Most families can comfortably qualify for a mortgage on a median-priced home.';
  } else if (data.value >= 100) {
    interpretation = 'Moderately Affordable';
    explanation =
      'The median family income is just about enough to qualify for a median-priced home.';
  } else if (data.value >= 80) {
    interpretation = 'Somewhat Unaffordable';
    explanation =
      'Many families may struggle to qualify for a mortgage on a median-priced home.';
  } else {
    interpretation = 'Very Unaffordable';
    explanation =
      'Housing is very expensive relative to income levels, making homeownership difficult for typical families.';
  }

  return JSON.stringify({
    index_value: data.value,
    as_of_date: data.date,
    interpretation,
    explanation,
    context: {
      meaning:
        'The index measures whether a typical family earns enough to qualify for a mortgage on a typical home at current rates.',
      baseline: 'An index of 100 means median income exactly qualifies for median home price.',
      higher_is_better: true,
    },
    source: 'Federal Reserve Economic Data (FRED) - FIXHAI series',
  });
}
