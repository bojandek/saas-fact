var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var agency_agent_loader_exports = {};
__export(agency_agent_loader_exports, {
  SaaSAgencyTeam: () => SaaSAgencyTeam,
  listAgents: () => listAgents,
  loadAgent: () => loadAgent,
  loadAllAgents: () => loadAllAgents,
  runAgentTask: () => runAgentTask
});
module.exports = __toCommonJS(agency_agent_loader_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_llm = require("./llm/index");
const AGENTS_DIR = path.join(__dirname, "agency-agents");
function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch)
    return {};
  const frontmatter = {};
  const lines = frontmatterMatch[1].split("\n");
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      frontmatter[key] = value;
    }
  }
  return frontmatter;
}
function loadAllAgents() {
  if (!fs.existsSync(AGENTS_DIR)) {
    return [];
  }
  const files = fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".md"));
  const agents = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(AGENTS_DIR, file), "utf-8");
    const meta = parseFrontmatter(content);
    agents.push({
      name: meta.name || file.replace(".md", ""),
      description: meta.description || "",
      color: meta.color || "blue",
      emoji: meta.emoji || "\u{1F916}",
      vibe: meta.vibe || "",
      systemPrompt: content,
      filename: file
    });
  }
  return agents;
}
function loadAgent(filename) {
  const filePath = path.join(AGENTS_DIR, `${filename}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  const meta = parseFrontmatter(content);
  return {
    name: meta.name || filename,
    description: meta.description || "",
    color: meta.color || "blue",
    emoji: meta.emoji || "\u{1F916}",
    vibe: meta.vibe || "",
    systemPrompt: content,
    filename: `${filename}.md`
  };
}
async function runAgentTask(agentFilename, task, context) {
  const agent = loadAgent(agentFilename);
  if (!agent) {
    return {
      agent: agentFilename,
      output: `Agent '${agentFilename}' nije prona\u0111en`,
      success: false
    };
  }
  try {
    const userMessage = context ? `Context:
${context}

Task:
${task}` : task;
    const output = await import_llm.llm.chat({
      messages: [
        { role: "user", content: userMessage }
      ],
      system: agent.systemPrompt,
      model: "claude-haiku-4-5"
    });
    return {
      agent: agent.name,
      output,
      success: true
    };
  } catch (error) {
    return {
      agent: agent.name,
      output: `Gre\u0161ka: ${error.message}`,
      success: false
    };
  }
}
const SaaSAgencyTeam = {
  /**
   * Growth Hacker — kreira viralni growth plan za generisani SaaS
   */
  async growthPlan(appName, niche, features) {
    const result = await runAgentTask(
      "marketing-growth-hacker",
      `Create a viral growth plan for a SaaS called "${appName}" in the "${niche}" niche.
      
Key features: ${features.join(", ")}

Deliver:
1. Top 3 acquisition channels with specific tactics
2. Viral loop mechanism
3. First 100 users strategy
4. Key growth metrics to track`
    );
    return result.output;
  },
  /**
   * UI Designer — review generisanog UI i preporuke
   */
  async uiReview(appName, components) {
    const result = await runAgentTask(
      "design-ui-designer",
      `Review the UI architecture for "${appName}" SaaS application.
      
Components: ${components.join(", ")}

Provide:
1. Design system recommendations (colors, typography, spacing)
2. Component hierarchy improvements
3. Mobile-first considerations
4. Accessibility requirements`
    );
    return result.output;
  },
  /**
   * Whimsy Injector — dodaje personality i delight u generisanu aplikaciju
   */
  async addWhimsy(appName, niche) {
    const result = await runAgentTask(
      "design-whimsy-injector",
      `Add personality and delight to "${appName}", a SaaS for the "${niche}" market.
      
Suggest:
1. 3 micro-interaction ideas
2. Loading state personality
3. Empty state messaging
4. Success celebration moments
5. Error state humanization`
    );
    return result.output;
  },
  /**
   * Security Engineer — audit generisanog koda
   */
  async securityAudit(appName, blocks) {
    const result = await runAgentTask(
      "engineering-security-engineer",
      `Security audit for "${appName}" SaaS using these blocks: ${blocks.join(", ")}
      
Check:
1. Authentication vulnerabilities
2. SQL injection risks
3. RLS policy completeness
4. API endpoint security
5. Data exposure risks`
    );
    return result.output;
  },
  /**
   * Reality Checker — finalna provjera prije deploya
   */
  async realityCheck(appName, generationSummary) {
    const result = await runAgentTask(
      "testing-reality-checker",
      `Production readiness check for "${appName}".
      
Generation summary:
${generationSummary}

Assess:
1. Is this actually production ready? (Default: NEEDS WORK)
2. What are the top 3 risks?
3. What must be fixed before launch?
4. Realistic quality rating (A-F)`
    );
    return result.output;
  },
  /**
   * Product Manager — kreira product roadmap
   */
  async productRoadmap(appName, niche, mvpFeatures) {
    const result = await runAgentTask(
      "product-manager",
      `Create a product roadmap for "${appName}" in the "${niche}" market.
      
MVP features: ${mvpFeatures.join(", ")}

Deliver:
1. Sprint 1 priorities (Week 1-2)
2. Sprint 2 priorities (Week 3-4)
3. V1.0 definition
4. Success metrics`
    );
    return result.output;
  },
  /**
   * SEO Specialist — SEO strategija za generisani SaaS
   */
  async seoStrategy(appName, niche) {
    const result = await runAgentTask(
      "marketing-seo-specialist",
      `SEO strategy for "${appName}", a SaaS in the "${niche}" market.
      
Deliver:
1. Primary keyword targets (5-10)
2. Content strategy for first 3 months
3. Technical SEO checklist
4. Link building approach`
    );
    return result.output;
  }
};
function listAgents() {
  return loadAllAgents().map((a) => ({
    name: a.name,
    emoji: a.emoji,
    vibe: a.vibe,
    filename: a.filename.replace(".md", "")
  }));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SaaSAgencyTeam,
  listAgents,
  loadAgent,
  loadAllAgents,
  runAgentTask
});
