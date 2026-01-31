import { CacheService, CACHE_TTL } from './cache';

export interface FREDObservation {
  date: string;
  value: string;
}

export interface FREDSeriesResponse {
  observations: FREDObservation[];
}

export type MortgageRateSeries = 'MORTGAGE30US' | 'MORTGAGE15US';

export interface CurrentRates {
  rate30Year: number;
  rate15Year: number;
  date: string;
}

export interface RateHistoryPoint {
  date: string;
  value: number;
}

export class FREDService {
  private readonly baseUrl = 'https://api.stlouisfed.org/fred';

  constructor(
    private apiKey: string,
    private cache: CacheService
  ) {}

  private async fetchSeries(
    seriesId: string,
    startDate?: string,
    endDate?: string
  ): Promise<FREDObservation[]> {
    const params = new URLSearchParams({
      series_id: seriesId,
      api_key: this.apiKey,
      file_type: 'json',
      sort_order: 'desc',
      limit: '100',
    });

    if (startDate) {
      params.set('observation_start', startDate);
    }
    if (endDate) {
      params.set('observation_end', endDate);
    }

    const response = await fetch(
      `${this.baseUrl}/series/observations?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
    }

    const data: FREDSeriesResponse = await response.json();
    return data.observations;
  }

  async getCurrentRate(series: MortgageRateSeries): Promise<number> {
    const cacheKey = `rate:${series}`;

    return this.cache.getOrFetch(
      cacheKey,
      async () => {
        const observations = await this.fetchSeries(series);
        const latest = observations.find(obs => obs.value !== '.');

        if (!latest) {
          throw new Error(`No valid data found for series ${series}`);
        }

        return parseFloat(latest.value);
      },
      { ttl: CACHE_TTL.MORTGAGE_RATES }
    );
  }

  async getCurrentRates(): Promise<CurrentRates> {
    const cacheKey = 'rates:current';

    return this.cache.getOrFetch(
      cacheKey,
      async () => {
        const [obs30, obs15] = await Promise.all([
          this.fetchSeries('MORTGAGE30US'),
          this.fetchSeries('MORTGAGE15US'),
        ]);

        const latest30 = obs30.find(obs => obs.value !== '.');
        const latest15 = obs15.find(obs => obs.value !== '.');

        if (!latest30 || !latest15) {
          throw new Error('Unable to fetch current mortgage rates');
        }

        return {
          rate30Year: parseFloat(latest30.value),
          rate15Year: parseFloat(latest15.value),
          date: latest30.date,
        };
      },
      { ttl: CACHE_TTL.MORTGAGE_RATES }
    );
  }

  async getRateHistory(
    series: MortgageRateSeries,
    startDate: string,
    endDate?: string
  ): Promise<RateHistoryPoint[]> {
    const cacheKey = `history:${series}:${startDate}:${endDate || 'now'}`;

    return this.cache.getOrFetch(
      cacheKey,
      async () => {
        const observations = await this.fetchSeries(series, startDate, endDate);

        return observations
          .filter(obs => obs.value !== '.')
          .map(obs => ({
            date: obs.date,
            value: parseFloat(obs.value),
          }))
          .reverse(); // Oldest first
      },
      { ttl: CACHE_TTL.MORTGAGE_RATES }
    );
  }

  async getAffordabilityIndex(): Promise<{ value: number; date: string }> {
    const cacheKey = 'affordability:current';

    return this.cache.getOrFetch(
      cacheKey,
      async () => {
        const observations = await this.fetchSeries('FIXHAI');
        const latest = observations.find(obs => obs.value !== '.');

        if (!latest) {
          throw new Error('Unable to fetch affordability index');
        }

        return {
          value: parseFloat(latest.value),
          date: latest.date,
        };
      },
      { ttl: CACHE_TTL.AFFORDABILITY_INDEX }
    );
  }

  async getHomePriceIndex(months: number = 12): Promise<RateHistoryPoint[]> {
    const cacheKey = `homeprice:${months}`;

    return this.cache.getOrFetch(
      cacheKey,
      async () => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const observations = await this.fetchSeries(
          'CSUSHPINSA',
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        return observations
          .filter(obs => obs.value !== '.')
          .map(obs => ({
            date: obs.date,
            value: parseFloat(obs.value),
          }))
          .reverse();
      },
      { ttl: CACHE_TTL.HOME_PRICE_INDEX }
    );
  }

  async getSeriesObservations(
    series: string,
    startDate: string,
    endDate?: string
  ): Promise<RateHistoryPoint[]> {
    const observations = await this.fetchSeries(series, startDate, endDate);

    return observations
      .filter(obs => obs.value !== '.')
      .map(obs => ({
        date: obs.date,
        value: parseFloat(obs.value),
      }))
      .reverse();
  }
}
