/**
 * @file This module provides a competitor analysis engine for pricing and feature lists.
 */

/**
 * Represents a competitor with its name, pricing plans, and features.
 */
export interface Competitor {
  id: string;
  name: string;
  pricingPlans: PricingPlan[];
  features: Feature[];
}

/**
 * Represents a pricing plan offered by a competitor.
 */
export interface PricingPlan {
  name: string;
  price: number;
  currency: string;
  featuresIncluded: string[];
}

/**
 * Represents a feature offered by a competitor.
 */
export interface Feature {
  name: string;
  description: string;
  isIncludedInPlans: string[]; // Names of pricing plans where this feature is included
}

/**
 * Represents the result of a pricing comparison.
 */
export interface PricingComparisonResult {
  competitorName: string;
  planName: string;
  price: number;
  currency: string;
  comparisonToAverage: string; // e.g., "20% higher than average"
}

/**
 * Represents the result of a feature comparison.
 */
export interface FeatureComparisonResult {
  featureName: string;
  competitorAvailability: { [competitorName: string]: boolean };
  description: string;
}

/**
 * A minimal competitor analysis engine that analyzes pricing and feature lists.
 */
export class CompetitorAnalysisEngine {
  private competitors: Competitor[] = [];

  /**
   * Adds a new competitor to the engine.
   * @param competitor The competitor to add.
   */
  addCompetitor(competitor: Competitor): void {
    this.competitors.push(competitor);
  }

  /**
   * Retrieves a competitor by its ID.
   * @param id The ID of the competitor to retrieve.
   * @returns The competitor if found, otherwise undefined.
   */
  getCompetitorById(id: string): Competitor | undefined {
    return this.competitors.find(comp => comp.id === id);
  }

  /**
   * Analyzes and compares pricing plans across all added competitors.
   * @returns An array of pricing comparison results.
   */
  comparePricing(): PricingComparisonResult[] {
    if (this.competitors.length === 0) {
      return [];
    }

    const allPrices: { price: number; currency: string }[] = [];
    this.competitors.forEach(comp => {
      comp.pricingPlans.forEach(plan => {
        allPrices.push({ price: plan.price, currency: plan.currency });
      });
    });

    // For simplicity, assuming all prices are in the same currency for average calculation.
    // In a real-world scenario, currency conversion would be necessary.
    const averagePrice = allPrices.reduce((sum, p) => sum + p.price, 0) / allPrices.length;

    const results: PricingComparisonResult[] = [];
    this.competitors.forEach(comp => {
      comp.pricingPlans.forEach(plan => {
        const difference = plan.price - averagePrice;
        const percentage = (difference / averagePrice) * 100;
        results.push({
          competitorName: comp.name,
          planName: plan.name,
          price: plan.price,
          currency: plan.currency,
          comparisonToAverage: `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}% ${percentage >= 0 ? 'higher' : 'lower'} than average`,
        });
      });
    });
    return results;
  }

  /**
   * Analyzes and compares features across all added competitors.
   * @returns An array of feature comparison results.
   */
  compareFeatures(): FeatureComparisonResult[] {
    if (this.competitors.length === 0) {
      return [];
    }

    const allFeatureNames = new Set<string>();
    this.competitors.forEach(comp => {
      comp.features.forEach(feature => allFeatureNames.add(feature.name));
    });

    const results: FeatureComparisonResult[] = [];
    allFeatureNames.forEach(featureName => {
      const competitorAvailability: { [competitorName: string]: boolean } = {};
      let featureDescription = '';

      this.competitors.forEach(comp => {
        const foundFeature = comp.features.find(f => f.name === featureName);
        competitorAvailability[comp.name] = !!foundFeature;
        if (foundFeature && !featureDescription) {
          featureDescription = foundFeature.description;
        }
      });

      results.push({
        featureName,
        competitorAvailability,
        description: featureDescription,
      });
    });
    return results;
  }

  /**
   * Simulates scraping pricing and feature data for a given competitor URL.
   * In a real-world scenario, this would involve web scraping libraries.
   * @param url The URL to scrape.
   * @returns A Promise that resolves with a Competitor object, or rejects on failure.
   */
  async scrapeCompetitorData(url: string): Promise<Competitor> {
    console.log(`Simulating scraping data from: ${url}`);
    // This is a placeholder for actual scraping logic.
    // In a real implementation, you would use a library like Cheerio or Puppeteer.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: `comp-${Date.now()}`,
          name: `Simulated Competitor from ${new URL(url).hostname}`,
          pricingPlans: [
            { name: 'Basic', price: 10, currency: 'USD', featuresIncluded: ['Feature A', 'Feature B'] },
            { name: 'Pro', price: 25, currency: 'USD', featuresIncluded: ['Feature A', 'Feature B', 'Feature C'] },
          ],
          features: [
            { name: 'Feature A', description: 'Core functionality A', isIncludedInPlans: ['Basic', 'Pro'] },
            { name: 'Feature B', description: 'Advanced functionality B', isIncludedInPlans: ['Basic', 'Pro'] },
            { name: 'Feature C', description: 'Premium functionality C', isIncludedInPlans: ['Pro'] },
          ],
        });
      }, 1000);
    });
  }
}
