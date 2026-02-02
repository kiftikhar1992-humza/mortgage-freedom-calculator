import {
  getCurrentRatesDefinition,
  executeGetCurrentRates,
} from './get-current-rates.js';
import {
  getRateHistoryDefinition,
  executeGetRateHistory,
} from './get-rate-history.js';
import {
  getAffordabilityDefinition,
  executeGetAffordability,
} from './get-affordability.js';
import {
  calculatePayoffDefinition,
  executeCalculatePayoff,
} from './calculate-savings.js';
import {
  compareRefinanceDefinition,
  executeCompareRefinance,
} from './compare-scenarios.js';

export const toolDefinitions = [
  getCurrentRatesDefinition,
  getRateHistoryDefinition,
  getAffordabilityDefinition,
  calculatePayoffDefinition,
  compareRefinanceDefinition,
];

export async function executeTool(toolName, input, fredService) {
  switch (toolName) {
    case 'get_current_rates':
      return executeGetCurrentRates(input, fredService);

    case 'get_rate_history':
      return executeGetRateHistory(input, fredService);

    case 'get_affordability_index':
      return executeGetAffordability(fredService);

    case 'calculate_payoff':
      return executeCalculatePayoff(input);

    case 'compare_refinance':
      return executeCompareRefinance(input);

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
