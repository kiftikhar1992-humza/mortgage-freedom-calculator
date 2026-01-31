import { FREDService } from '../services/fred';
import {
  getCurrentRatesDefinition,
  executeGetCurrentRates,
  GetCurrentRatesInput,
} from './get-current-rates';
import {
  getRateHistoryDefinition,
  executeGetRateHistory,
  GetRateHistoryInput,
} from './get-rate-history';
import {
  getAffordabilityDefinition,
  executeGetAffordability,
} from './get-affordability';
import {
  calculatePayoffDefinition,
  executeCalculatePayoff,
  CalculatePayoffInput,
} from './calculate-savings';
import {
  compareRefinanceDefinition,
  executeCompareRefinance,
  CompareRefinanceInput,
} from './compare-scenarios';

// Export all tool definitions for Claude
export const toolDefinitions = [
  getCurrentRatesDefinition,
  getRateHistoryDefinition,
  getAffordabilityDefinition,
  calculatePayoffDefinition,
  compareRefinanceDefinition,
];

// Tool executor
export async function executeTool(
  toolName: string,
  input: unknown,
  fredService: FREDService
): Promise<string> {
  switch (toolName) {
    case 'get_current_rates':
      return executeGetCurrentRates(input as GetCurrentRatesInput, fredService);

    case 'get_rate_history':
      return executeGetRateHistory(input as GetRateHistoryInput, fredService);

    case 'get_affordability_index':
      return executeGetAffordability(fredService);

    case 'calculate_payoff':
      return executeCalculatePayoff(input as CalculatePayoffInput);

    case 'compare_refinance':
      return executeCompareRefinance(input as CompareRefinanceInput);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

export {
  getCurrentRatesDefinition,
  getRateHistoryDefinition,
  getAffordabilityDefinition,
  calculatePayoffDefinition,
  compareRefinanceDefinition,
};
