interface CrawlResult {
    url: string;
    title: string;
    content: string;
}
export declare class OpenCrawlAgent {
    private crawlServiceUrl;
    constructor();
    crawl(query: string, limit?: number): Promise<CrawlResult[]>;
}
export {};
//# sourceMappingURL=opencrawl-agent.d.ts.map