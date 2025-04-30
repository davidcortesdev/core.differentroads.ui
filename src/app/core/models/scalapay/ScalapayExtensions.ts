import { ScalapayTravel } from './ScalapayTravel';

/**
 * Represents additional extensions for the order.
 * Example: { "industry": { "travel": { "startDate": "2023-11-30", "endDate": "2023-12-18" } } }
 */
export interface ScalapayExtensions {
  industry: {
    travel: ScalapayTravel;
  };
}
