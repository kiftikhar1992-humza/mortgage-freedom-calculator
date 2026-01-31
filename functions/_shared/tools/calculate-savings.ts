export const calculatePayoffDefinition = {
  name: 'calculate_payoff',
  description:
    'Calculate mortgage payoff details including monthly payment, total interest, and time to payoff. Use this to show users how their current mortgage will amortize or to calculate the impact of extra payments.',
  input_schema: {
    type: 'object' as const,
    properties: {
      balance: {
        type: 'number',
        description: 'Current loan balance in dollars',
      },
      rate: {
        type: 'number',
        description: 'Annual interest rate as a percentage (e.g., 6.5 for 6.5%)',
      },
      term: {
        type: 'number',
        description: 'Remaining term in months',
      },
      extra_payment: {
        type: 'number',
        description: 'Optional extra monthly payment amount in dollars',
      },
    },
    required: ['balance', 'rate', 'term'],
  },
};

export interface CalculatePayoffInput {
  balance: number;
  rate: number;
  term: number;
  extra_payment?: number;
}

interface AmortizationResult {
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  monthsToPayoff: number;
}

function calculateAmortization(
  balance: number,
  annualRate: number,
  termMonths: number,
  extraPayment: number = 0
): AmortizationResult {
  const monthlyRate = annualRate / 100 / 12;

  // Calculate base monthly payment
  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = balance / termMonths;
  } else {
    monthlyPayment =
      (balance * (monthlyRate * Math.pow(1 + monthlyRate, termMonths))) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);
  }

  const totalPayment = monthlyPayment + extraPayment;

  let remainingBalance = balance;
  let totalInterest = 0;
  let months = 0;

  while (remainingBalance > 0.01 && months < 600) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = Math.min(totalPayment - interestPayment, remainingBalance);

    if (principalPayment <= 0) {
      // Payment doesn't cover interest - infinite loop prevention
      return {
        monthlyPayment,
        totalInterest: Infinity,
        totalPaid: Infinity,
        monthsToPayoff: Infinity,
      };
    }

    totalInterest += interestPayment;
    remainingBalance -= principalPayment;
    months++;
  }

  return {
    monthlyPayment,
    totalInterest,
    totalPaid: totalInterest + balance,
    monthsToPayoff: months,
  };
}

export function executeCalculatePayoff(input: CalculatePayoffInput): string {
  const { balance, rate, term, extra_payment = 0 } = input;

  // Calculate original schedule
  const original = calculateAmortization(balance, rate, term);

  // Calculate with extra payment
  const accelerated = calculateAmortization(balance, rate, term, extra_payment);

  const monthsSaved = original.monthsToPayoff - accelerated.monthsToPayoff;
  const yearsSaved = Math.floor(monthsSaved / 12);
  const remainingMonthsSaved = monthsSaved % 12;
  const interestSaved = original.totalInterest - accelerated.totalInterest;

  const result: Record<string, unknown> = {
    original_schedule: {
      monthly_payment: `$${original.monthlyPayment.toFixed(2)}`,
      total_interest: `$${original.totalInterest.toFixed(2)}`,
      total_paid: `$${original.totalPaid.toFixed(2)}`,
      payoff_months: original.monthsToPayoff,
      payoff_years: (original.monthsToPayoff / 12).toFixed(1),
    },
  };

  if (extra_payment > 0) {
    result.accelerated_schedule = {
      monthly_payment: `$${(original.monthlyPayment + extra_payment).toFixed(2)}`,
      extra_payment: `$${extra_payment.toFixed(2)}`,
      total_interest: `$${accelerated.totalInterest.toFixed(2)}`,
      total_paid: `$${accelerated.totalPaid.toFixed(2)}`,
      payoff_months: accelerated.monthsToPayoff,
      payoff_years: (accelerated.monthsToPayoff / 12).toFixed(1),
    };

    result.savings = {
      interest_saved: `$${interestSaved.toFixed(2)}`,
      time_saved: yearsSaved > 0
        ? `${yearsSaved} years${remainingMonthsSaved > 0 ? ` and ${remainingMonthsSaved} months` : ''}`
        : `${remainingMonthsSaved} months`,
      months_saved: monthsSaved,
    };
  }

  return JSON.stringify(result);
}
