export const compareRefinanceDefinition = {
  name: 'compare_refinance',
  description:
    'Compare the current mortgage against a potential refinance scenario. Calculates break-even point, total savings, and whether refinancing makes financial sense.',
  input_schema: {
    type: 'object' as const,
    properties: {
      current_balance: {
        type: 'number',
        description: 'Current loan balance in dollars',
      },
      current_rate: {
        type: 'number',
        description: 'Current annual interest rate as a percentage',
      },
      current_remaining: {
        type: 'number',
        description: 'Remaining months on current loan',
      },
      new_rate: {
        type: 'number',
        description: 'New annual interest rate as a percentage',
      },
      closing_costs: {
        type: 'number',
        description: 'Total closing costs for the refinance in dollars',
      },
      new_term: {
        type: 'number',
        description: 'Optional new loan term in months. Defaults to 360 (30 years).',
      },
    },
    required: [
      'current_balance',
      'current_rate',
      'current_remaining',
      'new_rate',
      'closing_costs',
    ],
  },
};

export interface CompareRefinanceInput {
  current_balance: number;
  current_rate: number;
  current_remaining: number;
  new_rate: number;
  closing_costs: number;
  new_term?: number;
}

function calculateMonthlyPayment(balance: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) {
    return balance / termMonths;
  }
  return (
    (balance * (monthlyRate * Math.pow(1 + monthlyRate, termMonths))) /
    (Math.pow(1 + monthlyRate, termMonths) - 1)
  );
}

function calculateTotalInterest(balance: number, annualRate: number, termMonths: number): number {
  const monthlyPayment = calculateMonthlyPayment(balance, annualRate, termMonths);
  const monthlyRate = annualRate / 100 / 12;
  let remaining = balance;
  let totalInterest = 0;
  let months = 0;

  while (remaining > 0.01 && months < termMonths) {
    const interest = remaining * monthlyRate;
    totalInterest += interest;
    remaining -= monthlyPayment - interest;
    months++;
  }

  return totalInterest;
}

export function executeCompareRefinance(input: CompareRefinanceInput): string {
  const {
    current_balance,
    current_rate,
    current_remaining,
    new_rate,
    closing_costs,
    new_term = 360,
  } = input;

  // Current loan calculations
  const currentMonthlyPayment = calculateMonthlyPayment(
    current_balance,
    current_rate,
    current_remaining
  );
  const currentTotalInterest = calculateTotalInterest(
    current_balance,
    current_rate,
    current_remaining
  );
  const currentTotalPaid = current_balance + currentTotalInterest;

  // New loan calculations (including closing costs rolled in)
  const newBalance = current_balance + closing_costs;
  const newMonthlyPayment = calculateMonthlyPayment(newBalance, new_rate, new_term);
  const newTotalInterest = calculateTotalInterest(newBalance, new_rate, new_term);
  const newTotalPaid = newBalance + newTotalInterest;

  // Monthly savings
  const monthlySavings = currentMonthlyPayment - newMonthlyPayment;

  // Break-even calculation (months until closing costs are recovered through monthly savings)
  let breakEvenMonths: number | string;
  if (monthlySavings <= 0) {
    breakEvenMonths = 'Never (new payment is higher or equal)';
  } else {
    breakEvenMonths = Math.ceil(closing_costs / monthlySavings);
  }

  // Long-term comparison (only comparing remaining term costs)
  const lifetimeSavings = currentTotalPaid - newTotalPaid;

  // Rate difference
  const rateDiff = current_rate - new_rate;

  // Recommendation logic
  let recommendation: string;
  let reasoning: string;

  if (rateDiff < 0) {
    recommendation = 'Not Recommended';
    reasoning = 'The new rate is higher than your current rate.';
  } else if (rateDiff < 0.5) {
    recommendation = 'Likely Not Worth It';
    reasoning =
      'The rate reduction is minimal. Closing costs may take too long to recover.';
  } else if (typeof breakEvenMonths === 'number' && breakEvenMonths > 48) {
    recommendation = 'Consider Carefully';
    reasoning = `It will take ${breakEvenMonths} months (${(breakEvenMonths / 12).toFixed(1)} years) to recover closing costs. Only refinance if you plan to stay in the home longer.`;
  } else if (typeof breakEvenMonths === 'number' && breakEvenMonths <= 24) {
    recommendation = 'Strong Candidate';
    reasoning = `You'll recover closing costs in ${breakEvenMonths} months and save ${formatCurrency(lifetimeSavings)} over the life of the loan.`;
  } else {
    recommendation = 'Worth Considering';
    reasoning = `Break-even in ${breakEvenMonths} months. Review your plans for staying in the home.`;
  }

  return JSON.stringify({
    current_loan: {
      balance: formatCurrency(current_balance),
      rate: `${current_rate}%`,
      remaining_months: current_remaining,
      remaining_years: (current_remaining / 12).toFixed(1),
      monthly_payment: formatCurrency(currentMonthlyPayment),
      total_remaining_interest: formatCurrency(currentTotalInterest),
      total_remaining_cost: formatCurrency(currentTotalPaid),
    },
    new_loan: {
      balance: formatCurrency(newBalance),
      note: 'Includes closing costs',
      rate: `${new_rate}%`,
      term_months: new_term,
      term_years: (new_term / 12).toFixed(0),
      monthly_payment: formatCurrency(newMonthlyPayment),
      total_interest: formatCurrency(newTotalInterest),
      total_cost: formatCurrency(newTotalPaid),
    },
    comparison: {
      rate_reduction: `${rateDiff.toFixed(2)}%`,
      monthly_savings: formatCurrency(monthlySavings),
      break_even_months: breakEvenMonths,
      break_even_years:
        typeof breakEvenMonths === 'number'
          ? (breakEvenMonths / 12).toFixed(1)
          : 'N/A',
      lifetime_savings: formatCurrency(lifetimeSavings),
      closing_costs: formatCurrency(closing_costs),
    },
    recommendation,
    reasoning,
  });
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
