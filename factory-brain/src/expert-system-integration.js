"use strict";
/**
 * Expert System Integration
 * Connect expert enhancements to memory session for seamless usage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeExpertSystem = initializeExpertSystem;
exports.getExpertSystem = getExpertSystem;
exports.recordAndLearnFromError = recordAndLearnFromError;
exports.checkForKnownRisks = checkForKnownRisks;
exports.auditDecision = auditDecision;
exports.buildDomainExpertise = buildDomainExpertise;
exports.findPastExamples = findPastExamples;
exports.askLearningQuestions = askLearningQuestions;
exports.assessImplementationRisk = assessImplementationRisk;
exports.correctMistake = correctMistake;
exports.getSystemExpertiseLevel = getSystemExpertiseLevel;
exports.shareYourExpertise = shareYourExpertise;
exports.recommendSolutionComplexity = recommendSolutionComplexity;
exports.getSystemHealthCheck = getSystemHealthCheck;
const expert_system_enhancements_1 = require("./expert-system-enhancements");
const logger_1 = require("./utils/logger");
let expertSystem = null;
/**
 * Initialize expert system for session
 */
function initializeExpertSystem(sessionId) {
    if (expertSystem)
        return expertSystem;
    expertSystem = new expert_system_enhancements_1.ExpertSystemEnhancements(sessionId);
    logger_1.logger.info('🧠🔬 Expert System initialized');
    return expertSystem;
}
/**
 * Get expert system instance
 */
function getExpertSystem() {
    if (!expertSystem) {
        throw new Error('Expert System not initialized. Call initializeExpertSystem(sessionId) first.');
    }
    return expertSystem;
}
/**
 * FEATURE 1: Error Prevention
 * Record when something goes wrong and prevent it next time
 */
async function recordAndLearnFromError(errorType, context, whatWentWrong, howToFixIt, preventionSteps) {
    const expert = getExpertSystem();
    const errorPattern = await expert.recordError(errorType, context, howToFixIt, preventionSteps);
    logger_1.logger.info(`✅ Error learned: ${errorType}\n  Prevention: ${preventionSteps.join(' → ')}`);
}
/**
 * FEATURE 2: Predictive Error Prevention
 * Before implementing, check if similar errors happened before
 */
async function checkForKnownRisks(context) {
    const expert = getExpertSystem();
    const alerts = await expert.predictErrors(context);
    if (alerts.length === 0) {
        return {
            has_risks: false,
            alerts: [],
            message: '✅ No similar error patterns found. Looks safe!',
        };
    }
    return {
        has_risks: true,
        alerts,
        message: `⚠️ Found ${alerts.length} similar error patterns. Review prevention steps.`,
    };
}
/**
 * FEATURE 3: Complete Decision Audit
 * Track every decision with full context and outcome
 */
async function auditDecision(recommendation, confidence, context, result, whatYouLearned, implementationTime, teamEffort) {
    const expert = getExpertSystem();
    await expert.recordDecisionAudit(recommendation, confidence, context, result, whatYouLearned, {
        time_to_implement: implementationTime,
        complexity: getComplexityScore(recommendation),
        team_effort: teamEffort,
    });
    logger_1.logger.info(`📋 Decision audited: ${recommendation} → ${result}`);
}
/**
 * FEATURE 4: Domain Specialization
 * Become expert in specific domains (microservices, mobile, etc)
 */
async function buildDomainExpertise(domain, successfulPatterns, failedPatterns, bestPractices) {
    const expert = getExpertSystem();
    // Count successes/failures from audit trail
    const successCount = successfulPatterns.length * 3; // Multiply by 3 for impact weight
    const failureCount = failedPatterns.length;
    await expert.specializeDomain(domain, successCount, failureCount, successfulPatterns, failedPatterns, bestPractices);
    logger_1.logger.info(`🎯 Expertise built: ${domain} with ${successfulPatterns.length} successful patterns`);
}
/**
 * FEATURE 5: Find Similar Past Situations
 * "Hey, I solved something similar before. Here's what happened..."
 */
async function findPastExamples(currentSituation, similarity_percentage = 75) {
    const expert = getExpertSystem();
    const comparable = await expert.findComparableSituations(currentSituation, similarity_percentage / 100);
    if (comparable.length === 0) {
        return {
            found: 0,
            examples: [],
            recommendation: 'No similar situations found in history. This might be novel!',
        };
    }
    const successes = comparable.filter(c => c.outcome === 'success').length;
    const recommendation = successes / comparable.length > 0.7
        ? `✅ Based on ${successes}/${comparable.length} similar cases, this approach works well!`
        : `⚠️ Only ${successes}/${comparable.length} similar cases succeeded. High risk.`;
    return {
        found: comparable.length,
        examples: comparable,
        recommendation,
    };
}
/**
 * FEATURE 6: Active Learning Questions
 * System asks questions to improve its expertise
 */
async function askLearningQuestions(domain) {
    const expert = getExpertSystem();
    return await expert.generateLearningQuestions(domain);
}
/**
 * FEATURE 7: Risk Assessment
 * Before implementing, evaluate potential risks
 */
async function assessImplementationRisk(recommendation, context) {
    const expert = getExpertSystem();
    const assessment = await expert.assessRisk(recommendation, context);
    const emoji = assessment.risk_level === 'low' ? '✅' : assessment.risk_level === 'medium' ? '⚠️' : '🚨';
    logger_1.logger.info(`${emoji} Risk Assessment: ${assessment.risk_level}`);
    return {
        risk_level: assessment.risk_level,
        confidence: assessment.risk_score,
        identified_risks: assessment.identified_risks,
        mitigations: assessment.mitigation_strategies,
    };
}
/**
 * FEATURE 8: Self-Correction
 * When you realize the recommendation was wrong, teach the brain
 */
async function correctMistake(whatYouAskedFor, whatItRecommended, whatYouShouldHaveDone, whyItWasMistaken) {
    const expert = getExpertSystem();
    await expert.recordCorrection(whatYouRecommended, whatYouShouldHaveDone, whyItWasMistaken);
    logger_1.logger.info(`🔄 Self-correction recorded: ${whatYouShouldHaveDone}`);
}
/**
 * FEATURE 9: Expert Status Report
 * See how expert the system has become
 */
async function getSystemExpertiseLevel() {
    const expert = getExpertSystem();
    const report = await expert.getExpertiseReport();
    return {
        overall_expertise_percent: Math.round(report.overall_expertise * 100),
        success_rate_percent: Math.round(report.success_rate * 100),
        error_prevention_rate_percent: Math.round(report.error_prevention_rate * 100),
        total_decisions_analyzed: report.total_decisions,
        domains_specialized: report.domains.map(d => d.domain),
        learning_trajectory: report.learning_trajectory,
        next_steps: report.recommendations,
    };
}
/**
 * FEATURE 10: Share Expertise (Anonymized)
 * Contribute to global expert network without revealing identity
 */
async function shareYourExpertise(domain) {
    const expert = getExpertSystem();
    await expert.shareLearnings(domain, true);
    logger_1.logger.info(`🤝 Your expertise in ${domain} shared with the community (anonymous)`);
}
/**
 * FEATURE 11: Cost-Accuracy Trade-off
 * Choose between cheap/simple or expensive/complex solutions
 */
async function recommendSolutionComplexity(context, budget) {
    const expert = getExpertSystem();
    const result = await expert.optimizeForCostAccuracy(context, budget);
    const text = budget === 'low'
        ? '💰 Simple solution - Quick, cheap, 70% success rate'
        : budget === 'medium'
            ? '⚖️ Balanced solution - Good trade-off, 85% success rate'
            : '🎯 Complex solution - Premium, most reliable, 95% success rate';
    return {
        recommendation: result.recommendation,
        expected_success: result.expected_success_rate,
        implementation_cost: result.implementation_cost,
        maintenance_cost: result.maintenance_cost,
        recommendation_text: text,
    };
}
/**
 * FEATURE 12: Quick Health Check
 * Get a quick summary of system health and recommendations
 */
async function getSystemHealthCheck() {
    const report = await getSystemExpertiseLevel();
    const status = report.overall_expertise_percent > 75
        ? 'healthy'
        : report.overall_expertise_percent > 40
            ? 'improving'
            : 'needs-attention';
    return {
        status,
        message: status === 'healthy'
            ? '✨ System is performing like an expert!'
            : status === 'improving'
                ? '📈 System is learning and improving'
                : '⚠️ More feedback needed to improve',
        metrics: {
            expertise: report.overall_expertise_percent,
            success_rate: report.success_rate_percent,
            error_prevention: report.error_prevention_rate_percent,
        },
        recommendations: report.next_steps,
    };
}
/**
 * Helper: Calculate complexity score based on recommendation text
 */
function getComplexityScore(recommendation) {
    const complexityKeywords = [
        'microservices',
        'distributed',
        'complex',
        'advanced',
        'enterprise',
        'scalable',
    ];
    const simpleKeywords = ['simple', 'monolith', 'basic', 'easy', 'straightforward'];
    let score = 5; // Base score 5/10
    for (const keyword of complexityKeywords) {
        if (recommendation.toLowerCase().includes(keyword)) {
            score += 2;
        }
    }
    for (const keyword of simpleKeywords) {
        if (recommendation.toLowerCase().includes(keyword)) {
            score -= 2;
        }
    }
    return Math.min(Math.max(score, 1), 10); // Clamp 1-10
}
//# sourceMappingURL=expert-system-integration.js.map