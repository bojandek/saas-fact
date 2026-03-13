/**
 * AI Agency Model - 50-person equivalent AI team
 * Structured in Engineering, Design, and Marketing divisions
 */

import { EngineeringDivision } from './engineering-division'
import { DesignDivision } from './design-division'
import { MarketingDivision } from './marketing-division'

export class AIAgency {
  public engineering: EngineeringDivision
  public design: DesignDivision
  public marketing: MarketingDivision

  constructor(anthropicKey: string) {
    this.engineering = new EngineeringDivision(anthropicKey)
    this.design = new DesignDivision(anthropicKey)
    this.marketing = new MarketingDivision(anthropicKey)
  }

  /**
   * Get all agents across all divisions
   */
  getAllAgents() {
    return {
      engineering: this.engineering.getAgents(),
      design: this.design.getAgents(),
      marketing: this.marketing.getAgents(),
    }
  }

  /**
   * Get agent stats
   */
  getStats() {
    const eng = this.engineering.getAgents()
    const des = this.design.getAgents()
    const mar = this.marketing.getAgents()

    return {
      totalAgents: eng.length + des.length + mar.length,
      byDivision: {
        engineering: eng.length,
        design: des.length,
        marketing: mar.length,
      },
    }
  }
}

export { EngineeringDivision } from './engineering-division'
export { DesignDivision } from './design-division'
export { MarketingDivision } from './marketing-division'

export type { DivisionAgent, SprintPlan, DesignSpec, MarketingCampaign } from './types'
