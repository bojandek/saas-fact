import pino from 'pino';
import { CoverageReport, QAMetrics } from './types';

const logger = pino();

/**
 * Analyzes test coverage and generates insights
 */
export class CoverageAnalyzer {
  private coverageMap: Map<string, Coverage> = new Map();

  async analyzeCoverage(coverageData: any): Promise<CoverageReport> {
    try {
      const report: CoverageReport = {
        projectId: coverageData.projectId || 'unknown',
        timestamp: new Date(),
        overall: {
          statements: this.calculateMetric(coverageData, 'statements'),
          branches: this.calculateMetric(coverageData, 'branches'),
          functions: this.calculateMetric(coverageData, 'functions'),
          lines: this.calculateMetric(coverageData, 'lines')
        },
        files: this.extractFileMetrics(coverageData),
        uncoveredLines: this.findUncoveredLines(coverageData)
      };

      logger.info(
        { 
          projectId: report.projectId,
          coverage: report.overall 
        },
        'Coverage analysis completed'
      );

      return report;
    } catch (error) {
      logger.error({ error }, 'Failed to analyze coverage');
      throw error;
    }
  }

  /**
   * Identifies files with low coverage
   */
  async identifyGaps(coverageReport: CoverageReport, threshold: number = 80): Promise<string[]> {
    const gaps: string[] = [];

    for (const [file, metrics] of Object.entries(coverageReport.files)) {
      const avgCoverage =
        ((metrics as any).statements + (metrics as any).branches + (metrics as any).functions + (metrics as any).lines) / 4;

      if (avgCoverage < threshold) {
        gaps.push(file);
      }
    }

    return gaps;
  }

  /**
   * Generates Coverage Report with action items
   */
  async generateReport(
    coverageReport: CoverageReport,
    threshold: number = 80
  ): Promise<string> {
    const gaps = await this.identifyGaps(coverageReport, threshold);
    
    const report = `
# Coverage Report - ${new Date(coverageReport.timestamp).toISOString()}
## Project: ${coverageReport.projectId}

## Overall Coverage
- Statements: ${coverageReport.overall.statements}%
- Branches: ${coverageReport.overall.branches}%
- Functions: ${coverageReport.overall.functions}%
- Lines: ${coverageReport.overall.lines}%

## Files Below ${threshold}% Threshold (${gaps.length})
${gaps.map(file => `- ❌ ${file}`).join('\n')}

## Uncovered Lines
${coverageReport.uncoveredLines
  .map(
    (item: any) =>
      `### ${item.file}
Lines: ${item.lines.join(', ')}`
  )
  .join('\n\n')}

## Recommendations
1. Focus on files with <${threshold}% coverage
2. Add tests for critical code paths first
3. Use mutation testing to validate test quality
4. Review skipped tests and unskip if applicable
`;

    return report;
  }

  /**
   * Calculates QA Metrics from test results
   */
  async calculateMetrics(testResults: any[]): Promise<QAMetrics> {
    const passed = testResults.filter(r => r.status === 'passed').length;
    const failed = testResults.filter(r => r.status === 'failed').length;
    const skipped = testResults.filter(r => r.status === 'skipped').length;
    const total = testResults.length;

    const totalDuration = testResults.reduce((sum, r) => sum + (r.duration || 0), 0);
    const avgDuration = total > 0 ? totalDuration / total : 0;

    // Calculate flakiness (tests that sometimes fail, sometimes pass)
    const flakyTests = this.detectFlakyTests(testResults);
    const flakinessPercentage = total > 0 ? (flakyTests.length / total) * 100 : 0;

    const metrics: QAMetrics = {
      projectId: testResults[0]?.projectId || 'unknown',
      timestamp: new Date(),
      totalTests: total,
      passedTests: passed,
      failedTests: failed,
      skippedTests: skipped,
      totalDuration,
      averageDuration: avgDuration,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      bugsDensity: this.calculateBugDensity(failed),
      flakiness: flakinessPercentage
    };

    logger.info({ metrics }, 'QA metrics calculated');
    return metrics;
  }

  /**
   * Detects test flakiness patterns
   */
  private detectFlakyTests(testResults: any[]): string[] {
    const testMap = new Map<string, any[]>();

    // Group results by test name
    for (const result of testResults) {
      if (!testMap.has(result.name)) {
        testMap.set(result.name, []);
      }
      testMap.get(result.name)!.push(result);
    }

    // Identify flaky tests (mixed results)
    const flakyTests: string[] = [];
    for (const [testName, results] of testMap) {
      const statuses = new Set(results.map(r => r.status));
      if (statuses.size > 1) {
        flakyTests.push(testName);
      }
    }

    return flakyTests;
  }

  private calculateBugDensity(failedTests: number): number {
    // Placeholder: assume 1000 LOC per project
    return (failedTests / 1000) * 1000;
  }

  private calculateMetric(coverageData: any, metric: string): number {
    if (!coverageData[metric]) return 0;
    const covered = coverageData[metric].covered || 0;
    const total = coverageData[metric].total || 1;
    return Math.round((covered / total) * 100);
  }

  private extractFileMetrics(coverageData: any): Record<string, any> {
    const files: Record<string, any> = {};

    if (coverageData.files) {
      for (const [file, data] of Object.entries(coverageData.files)) {
        const fileData = data as any;
        files[file] = {
          statements: this.calculateMetric(fileData, 'statements'),
          branches: this.calculateMetric(fileData, 'branches'),
          functions: this.calculateMetric(fileData, 'functions'),
          lines: this.calculateMetric(fileData, 'lines')
        };
      }
    }

    return files;
  }

  private findUncoveredLines(coverageData: any): Array<{ file: string; lines: number[] }> {
    const uncovered: Array<{ file: string; lines: number[] }> = [];

    if (coverageData.files) {
      for (const [file, data] of Object.entries(coverageData.files)) {
        const fileData = data as any;
        if (fileData.uncoveredLines) {
          uncovered.push({
            file,
            lines: fileData.uncoveredLines
          });
        }
      }
    }

    return uncovered;
  }
}

interface Coverage {
  covered: number;
  total: number;
}

export default CoverageAnalyzer;
