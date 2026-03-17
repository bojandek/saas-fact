'use client'

import { useState, useEffect, useRef } from 'react';
import { WarRoomOrchestrator, AgentMessage, AgentContext } from '../../factory-brain/src/war-room-orchestrator';
import { Button } from '@saas-factory/ui';

interface GeneratedTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: string;
}

interface ArchitectBlueprint {
  sqlSchema: string;
  apiSpec: string;
  rlsPolicies: string;
}

interface LandingPageContent {
  hero: {
    headline: string;
    subheadline: string;
    callToAction: string;
  };
  features: Array<{
    title: string;
    description: string;
  }>;
  pricing: Array<{
    planName: string;
    price: string;
    features: string[];
    callToAction: string;
  }>;
  testimonials: Array<{
    quote: string;
    author: string;
    company: string;
  }>;
}

interface GrowthPlan {
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  socialMediaPosts: Array<{
    platform: string;
    content: string;
    hashtags: string[];
  }>;
  emailCampaign: Array<{
    subject: string;
    body: string;
  }>;
}




type Step = 'description' | 'theme' | 'blueprint' | 'landing' | 'growth' | 'compliance' | 'qa' | 'legal' | 'deploy' | 'complete';

export default function OrchestratorPage() {
  const [currentStep, setCurrentStep] = useState<Step>('description');
  const [saasDescription, setSaasDescription] = useState('');
  const [appName, setAppName] = useState('');
  const [theme, setTheme] = useState<GeneratedTheme | null>(null);
  const [blueprint, setBlueprint] = useState<ArchitectBlueprint | null>(null);
  const [landingPage, setLandingPage] = useState<LandingPageContent | null>(null);
  const [growthPlan, setGrowthPlan] = useState<GrowthPlan | null>(null);
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheckResult[] | null>(null);
  const [qaResults, setQaResults] = useState<any | null>(null);
  const [legalDocs, setLegalDocs] = useState<LegalDocument[] | null>(null);
  const [deploymentResult, setDeploymentResult] = useState<string | null>(null);
  const [warRoomMessages, setWarRoomMessages] = useState<AgentMessage[]>([]);
  const [currentAgentContext, setCurrentAgentContext] = useState<AgentContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [warRoomMessages]);

  const handleGenerateTheme = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: saasDescription, context: currentAgentContext }),
      });

      if (!response.ok) throw new Error('Failed to generate theme');
      const { theme: generatedTheme, messages, context } = await response.json();
      setTheme(generatedTheme);
      setWarRoomMessages((prev) => [...prev, ...messages]);
      setCurrentAgentContext(context);
      setCurrentStep('blueprint');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBlueprint = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/architect-blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: saasDescription, context: currentAgentContext }),
      });

      if (!response.ok) throw new Error('Failed to generate blueprint');
      const { blueprint: generatedBlueprint, messages, context } = await response.json();
      setBlueprint(generatedBlueprint);
      setWarRoomMessages((prev) => [...prev, ...messages]);
      setCurrentAgentContext(context);
      setCurrentStep('landing');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLandingPage = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-landing-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: saasDescription, context: currentAgentContext }),
      });

      if (!response.ok) throw new Error('Failed to generate landing page');
      const { landingPage: generatedLandingPage, messages, context } = await response.json();
      setLandingPage(generatedLandingPage);
      setWarRoomMessages((prev) => [...prev, ...messages]);
      setCurrentAgentContext(context);
      setCurrentStep('growth');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateGrowthPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-growth-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: saasDescription, context: currentAgentContext }),
      });

      if (!response.ok) throw new Error('Failed to generate growth plan');
      const { growthPlan: generatedGrowthPlan, messages, context } = await response.json();
      setGrowthPlan(generatedGrowthPlan);
      setWarRoomMessages((prev) => [...prev, ...messages]);
      setCurrentAgentContext(context);
      setCurrentStep('compliance');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunComplianceChecks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/check-compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saasDescription,
          generatedTheme: theme,
          generatedBlueprint: blueprint,
          generatedLandingPage: landingPage,
          generatedGrowthPlan: growthPlan,
          context: currentAgentContext,
        }),
      });

      if (!response.ok) throw new Error("Failed to run compliance checks");
      const { checks, messages, context } = await response.json();
      setComplianceChecks(checks);
      setWarRoomMessages((prev) => [...prev, ...messages]);
      setCurrentAgentContext(context);
      setCurrentStep("qa");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

    const handleRunQaTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/generate-qa-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saasDescription,
          appName,
          generatedTheme: theme,
          generatedBlueprint: blueprint,
          generatedLandingPage: landingPage,
          generatedGrowthPlan: growthPlan,
          context: currentAgentContext,
        }),
      });

      if (!response.ok) throw new Error("Failed to run QA tests");
      const { tests, messages, context } = await response.json();
    setQaResults(tests);
    setWarRoomMessages((prev) => [...prev, ...messages]);
    setCurrentAgentContext(context);
    setCurrentStep("legal");
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

const handleGenerateLegalDocs = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await fetch('/api/generate-legal-documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'SaaS Factory Inc.', // Placeholder, ideally from user input
        companyEmail: 'contact@saasfactory.com', // Placeholder
        companyAddress: '123 SaaS Lane, Innovation City', // Placeholder
        appName: appName,
        appDescription: saasDescription,
        dataProcessing: ['user_emails', 'payment_info', 'usage_analytics'], // Placeholder
        thirdPartyServices: ['stripe', 'supabase', 'google_analytics'], // Placeholder
        jurisdiction: 'EU', // Placeholder
        context: currentAgentContext,
      }),
    });
    const data = await response.json();
    if (data.success) {
      setLegalDocs(data.documents);
      setWarRoomMessages((prev) => [...prev, ...data.messages]);
      setCurrentAgentContext(data.context);
      setCurrentStep('deploy');
    } else {
      setError(`Failed to generate legal documents: ${data.error}`);
    }
  } catch (error: any) {
    setError(`Error generating legal documents: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

const handleDeploy = async () => {
  if (!theme || !blueprint) {
    setError('Theme and blueprint must be generated first');
    return;
  }

  setLoading(true);
  setError(null);
  try {
    const response = await fetch('/api/deploy-coolify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appName: appName.toLowerCase().replace(/\s/g, '-'),
        gitRepository: `https://github.com/bojandek/saas-fact`,
        branch: 'main',
        environment: 'production',
        domain: `${appName.toLowerCase().replace(/\s/g, '-')}.saas-factory.dev`,
        context: currentAgentContext,
      }),
    });

    if (!response.ok) throw new Error('Failed to deploy');
    const { message, messages, context } = await response.json();
    setDeploymentResult(message);
    setWarRoomMessages((prev) => [...prev, ...messages]);
    setCurrentAgentContext(context);
    setCurrentStep('complete');
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

return (
  <div className="container mx-auto p-6">
    <h1 className="text-4xl font-bold mb-2">SaaS Factory Orchestrator</h1>
    <p className="text-gray-600 mb-8">Build, Market & Deploy: Describe → Design → Architecture → Content → Growth → Compliance → QA → Legal → Live</p>

    {/* Step Indicator */}
    <div className="flex justify-between mb-8 overflow-x-auto">
      {(["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy", "complete"] as Step[]).map((step, idx) => (
        <div key={step} className="flex items-center flex-shrink-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              currentStep === step
                ? 'bg-blue-500 text-white'
                : ["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy"].includes(step) && 
                  ["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy", "complete"].indexOf(step) <= 
                  ["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy", "complete"].indexOf(currentStep)
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}
          >
            {idx + 1}
          </div>
          <span className="ml-2 text-xs font-medium whitespace-nowrap">{step.charAt(0).toUpperCase() + step.slice(1)}</span>
          {idx <
            (["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy", "complete"].length - 1) && (
            <div className={`flex-1 h-0.5 ${["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy"].includes(step) && 
                                          ["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy", "complete"].indexOf(step) < 
                                          ["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy", "complete"].indexOf(currentStep)
                                          ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          )}
        </div>
      ))}
    </div>

    {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

    {/* Input Description */}
    {currentStep === 'description' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 1: Describe Your SaaS Idea</h2>
        <p className="text-gray-600">Tell us what you want to build. Be as detailed as possible!</p>
        <input
          type="text"
          placeholder="e.g., A CRM for small businesses with AI-powered lead scoring"
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={saasDescription}
          onChange={(e) => setSaasDescription(e.target.value)}
        />
        <input
          type="text"
          placeholder="App Name (e.g., LeadFlow CRM)"
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
        />
        <Button onClick={() => setCurrentStep('theme')} disabled={!saasDescription || !appName}>Next: Generate Theme</Button>
      </div>
    )}

    {/* Generate Theme */}
    {currentStep === 'theme' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 2: Generate UI Theme (Nano Banana)</h2>
        <p className="text-gray-600">Nano Banana will create a unique design system for your SaaS.</p>
        <Button onClick={handleGenerateTheme} disabled={loading}>Generate Theme</Button>
        {theme && (
          <div className="mt-4 p-4 border rounded-md bg-gray-50">
            <h3 className="font-semibold">Generated Theme:</h3>
            <p>Primary: <span style={{ color: theme.primaryColor }}>{theme.primaryColor}</span></p>
            <p>Secondary: <span style={{ color: theme.secondaryColor }}>{theme.secondaryColor}</span></p>
            <p>Accent: <span style={{ color: theme.accentColor }}>{theme.accentColor}</span></p>
            <p>Font: {theme.fontFamily}</p>
            <p>Border Radius: {theme.borderRadius}</p>
            <Button onClick={() => setCurrentStep('blueprint')} className="mt-4">Next: Architect Blueprint</Button>
          </div>
        )}
      </div>
    )}

    {/* Architect Blueprint */}
    {currentStep === 'blueprint' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 3: Architect Database & API (Architect Agent)</h2>
        <p className="text-gray-600">Architect Agent will design your database schema and API structure.</p>
        <Button onClick={handleGenerateBlueprint} disabled={loading}>Generate Blueprint</Button>
        {blueprint && (
          <div className="mt-4 p-4 border rounded-md bg-gray-50">
            <h3 className="font-semibold">Generated Blueprint:</h3>
            <pre className="bg-gray-100 p-2 rounded-md text-sm overflow-x-auto">{JSON.stringify(blueprint, null, 2)}</pre>
            <Button onClick={() => setCurrentStep('landing')} className="mt-4">Next: Landing Page</Button>
          </div>
        )}
      </div>
    )}

    {/* Landing Page */}
    {currentStep === 'landing' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 4: Generate Landing Page (Nano Banana)</h2>
        <p className="text-gray-600">Nano Banana will create a compelling landing page for your SaaS.</p>
        <Button onClick={handleGenerateLandingPage} disabled={loading}>Generate Landing Page</Button>
        {landingPage && (
          <div className="mt-4 p-4 border border-green-200 rounded-md bg-green-50">
            <h3 className="font-semibold">Landing Page Content Generated!</h3>
            <p className="text-sm text-green-700">Headline: {landingPage.hero.headline}</p>
            <p className="text-sm text-green-700">Features: {landingPage.features.length}</p>
            <Button onClick={() => setCurrentStep('growth')} className="mt-4">Next: Growth Plan</Button>
          </div>
        )}
      </div>
    )}

    {/* Growth Plan */}
    {currentStep === 'growth' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 5: Generate Growth Plan (Growth Hacker Agent)</h2>
        <p className="text-gray-600">Growth Hacker Agent will create SEO, social media, and email strategies.</p>
        <Button onClick={handleGenerateGrowthPlan} disabled={loading}>Generate Growth Plan</Button>
        {growthPlan && (
          <div className="mt-4 p-4 border border-blue-200 rounded-md bg-blue-50">
            <h3 className="font-semibold">Growth Plan Generated!</h3>
            <p className="text-sm text-blue-700">SEO Title: {growthPlan.seo.metaTitle}</p>
            <p className="text-sm text-blue-700">Social Posts: {growthPlan.socialMediaPosts.length}</p>
            <Button onClick={() => setCurrentStep('compliance')} className="mt-4">Next: Compliance Checks</Button>
          </div>
        )}
      </div>
    )}

    {/* Compliance Checks */}
    {currentStep === 'compliance' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 6: Run Compliance Checks (Compliance Checker)</h2>
        <p className="text-gray-600">Compliance Checker will ensure your SaaS meets industry standards (GDPR, SOC2, etc.).</p>
        <Button onClick={handleRunComplianceChecks} disabled={loading}>Run Checks</Button>
        {complianceChecks && (
          <div className="mt-4 p-4 border rounded-md bg-yellow-50">
            <h3 className="font-semibold">Compliance Check Results:</h3>
            <ul className="list-disc pl-5 text-sm">
              {complianceChecks.map((check, index) => (
                <li key={index} className={check.status === 'fail' ? 'text-red-700' : check.status === 'warning' ? 'text-orange-700' : 'text-green-700'}>
                  [{check.status.toUpperCase()}] {check.rule}: {check.message}
                </li>
              ))}
            </ul>
            <Button onClick={() => setCurrentStep('qa')} className="mt-4">Next: QA Tests</Button>
          </div>
        )}
      </div>
    )}

    {/* QA Tests */}
    {currentStep === 'qa' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 7: Generate & Run QA Tests (QA Agent)</h2>
        <p className="text-gray-600">QA Agent will generate Playwright tests to ensure your SaaS is bug-free.</p>
        <Button onClick={handleRunQaTests} disabled={loading || !appName}>Generate & Run Tests</Button>
        {qaResults && (
          <div className="mt-4 p-4 border rounded-md bg-purple-50">
            <h3 className="font-semibold">QA Test Results:</h3>
            <pre className="bg-gray-100 p-2 rounded-md text-sm overflow-x-auto">{JSON.stringify(qaResults, null, 2)}</pre>
            <Button onClick={() => setCurrentStep('legal')} className="mt-4">Next: Legal Documents</Button>
          </div>
        )}
      </div>
    )}

    {/* Legal Documents */}
    {currentStep === 'legal' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 8: Generate Legal Documents (Legal Agent)</h2>
        <p className="text-gray-600">Legal Agent will generate GDPR-compliant Privacy Policy, Terms of Service, and DPA.</p>
        <Button onClick={handleGenerateLegalDocs} disabled={loading || !appName}>Generate Legal Docs</Button>
        {legalDocs && (
          <div className="mt-4 p-4 border rounded-md bg-orange-50">
            <h3 className="font-semibold">Generated Legal Documents:</h3>
            <ul className="list-disc pl-5 text-sm">
              {legalDocs.map((doc, index) => (
                <li key={index} className="text-orange-700">
                  [{doc.type.toUpperCase()}] Last Updated: {new Date(doc.lastUpdated).toLocaleDateString()}
                </li>
              ))}
            </ul>
            <Button onClick={() => setCurrentStep('deploy')} className="mt-4">Next: Deploy</Button>
          </div>
        )}
      </div>
    )}

    {/* Deploy */}
    {currentStep === 'deploy' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 9: Deploy to Production (Coolify Agent)</h2>
        <p className="text-gray-600">Coolify Agent will deploy your SaaS to your production environment.</p>
        <Button onClick={handleDeploy} disabled={loading || !theme || !blueprint}>Deploy SaaS</Button>
        {deploymentResult && (
          <div className="mt-4 p-4 border rounded-md bg-green-100">
            <h3 className="font-semibold">Deployment Result:</h3>
            <p className="text-sm text-green-800">{deploymentResult}</p>
            <Button onClick={() => setCurrentStep('complete')} className="mt-4">Finish</Button>
          </div>
        )}
      </div>
    )}

    {/* Complete */}
    {currentStep === 'complete' && (
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold text-green-600">SaaS Generation Complete!</h2>
        <p className="text-lg text-gray-700">Your SaaS has been successfully built, tested, and deployed.</p>
        <p className="text-sm text-gray-500">Check your Coolify dashboard for the live application.</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Start New SaaS</Button>
      </div>
    )}

    {/* War Room Messages */}
    <div className="mt-12 p-6 border rounded-lg bg-gray-50">
      <h2 className="text-xl font-semibold mb-4">AI War Room Communication Log</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto" ref={messagesEndRef}>
        {warRoomMessages.length === 0 && <p className="text-gray-500">No agent communication yet...</p>}
        {warRoomMessages.map((msg, index) => (
          <div key={index} className="flex items-start space-x-2">
            <span className="font-bold text-blue-600">[{msg.agent}]</span>
            <p className="text-gray-800">{msg.message}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);
}
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

const handleGenerateLegalDocs = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await fetch('/api/generate-legal-documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'SaaS Factory Inc.', // Placeholder, ideally from user input
        companyEmail: 'contact@saasfactory.com', // Placeholder
        companyAddress: '123 SaaS Lane, Innovation City', // Placeholder
        appName: appName,
        appDescription: saasDescription,
        dataProcessing: ['user_emails', 'payment_info', 'usage_analytics'], // Placeholder
        thirdPartyServices: ['stripe', 'supabase', 'google_analytics'], // Placeholder
        jurisdiction: 'EU', // Placeholder
        context: currentAgentContext,
      }),
    });
    const data = await response.json();
    if (data.success) {
      setLegalDocs(data.documents);
      setWarRoomMessages((prev) => [...prev, ...data.messages]);
      setCurrentAgentContext(data.context);
      setCurrentStep('deploy');
    } else {
      setError(`Failed to generate legal documents: ${data.error}`);
    }
  } catch (error: any) {
    setError(`Error generating legal documents: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

const handleDeploy = async () => {
  if (!theme || !blueprint) {
    setError('Theme and blueprint must be generated first');
    return;
  }

  setLoading(true);
  setError(null);
  try {
    const response = await fetch('/api/deploy-coolify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appName: appName.toLowerCase().replace(/\s/g, '-'),
        gitRepository: `https://github.com/bojandek/saas-fact`,
        branch: 'main',
        environment: 'production',
        domain: `${appName.toLowerCase().replace(/\s/g, '-')}.saas-factory.dev`,
        context: currentAgentContext,
      }),
    });

    if (!response.ok) throw new Error('Failed to deploy');
    const { message, messages, context } = await response.json();
    setDeploymentResult(message);
    setWarRoomMessages((prev) => [...prev, ...messages]);
    setCurrentAgentContext(context);
    setCurrentStep('complete');
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

return (
  <div className="container mx-auto p-6">
    <h1 className="text-4xl font-bold mb-2">SaaS Factory Orchestrator</h1>
    <p className="text-gray-600 mb-8">Build, Market & Deploy: Describe → Design → Architecture → Content → Growth → Compliance → QA → Legal → Live</p>

    {/* Step Indicator */}
    <div className="flex justify-between mb-8 overflow-x-auto">
      {(["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy", "complete"] as Step[]).map((step, idx) => (
        <div key={step} className="flex items-center flex-shrink-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              currentStep === step
                ? 'bg-blue-500 text-white'
                : ["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy"].includes(step) && 
                  ["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy", "complete"].indexOf(step) <= 
                  ["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy", "complete"].indexOf(currentStep)
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}
          >
            {idx + 1}
          </div>
          <span className="ml-2 text-xs font-medium whitespace-nowrap">{step.charAt(0).toUpperCase() + step.slice(1)}</span>
          {idx <
            (["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy", "complete"].length - 1) && (
            <div className={`flex-1 h-0.5 ${["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy"].includes(step) && 
                                          ["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy", "complete"].indexOf(step) < 
                                          ["description", "theme", "blueprint", "landing", "growth", "compliance", "qa", "legal", "deploy", "complete"].indexOf(currentStep)
                                          ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          )}
        </div>
      ))}
    </div>

    {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

    {/* Input Description */}
    {currentStep === 'description' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 1: Describe Your SaaS Idea</h2>
        <p className="text-gray-600">Tell us what you want to build. Be as detailed as possible!</p>
        <input
          type="text"
          placeholder="e.g., A CRM for small businesses with AI-powered lead scoring"
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={saasDescription}
          onChange={(e) => setSaasDescription(e.target.value)}
        />
        <input
          type="text"
          placeholder="App Name (e.g., LeadFlow CRM)"
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
        />
        <Button onClick={() => setCurrentStep('theme')} disabled={!saasDescription || !appName}>Next: Generate Theme</Button>
      </div>
    )}

    {/* Generate Theme */}
    {currentStep === 'theme' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 2: Generate UI Theme (Nano Banana)</h2>
        <p className="text-gray-600">Nano Banana will create a unique design system for your SaaS.</p>
        <Button onClick={handleGenerateTheme} disabled={loading}>Generate Theme</Button>
        {theme && (
          <div className="mt-4 p-4 border rounded-md bg-gray-50">
            <h3 className="font-semibold">Generated Theme:</h3>
            <p>Primary: <span style={{ color: theme.primaryColor }}>{theme.primaryColor}</span></p>
            <p>Secondary: <span style={{ color: theme.secondaryColor }}>{theme.secondaryColor}</span></p>
            <p>Accent: <span style={{ color: theme.accentColor }}>{theme.accentColor}</span></p>
            <p>Font: {theme.fontFamily}</p>
            <p>Border Radius: {theme.borderRadius}</p>
            <Button onClick={() => setCurrentStep('blueprint')} className="mt-4">Next: Architect Blueprint</Button>
          </div>
        )}
      </div>
    )}

    {/* Architect Blueprint */}
    {currentStep === 'blueprint' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 3: Architect Database & API (Architect Agent)</h2>
        <p className="text-gray-600">Architect Agent will design your database schema and API structure.</p>
        <Button onClick={handleGenerateBlueprint} disabled={loading}>Generate Blueprint</Button>
        {blueprint && (
          <div className="mt-4 p-4 border rounded-md bg-gray-50">
            <h3 className="font-semibold">Generated Blueprint:</h3>
            <pre className="bg-gray-100 p-2 rounded-md text-sm overflow-x-auto">{JSON.stringify(blueprint, null, 2)}</pre>
            <Button onClick={() => setCurrentStep('landing')} className="mt-4">Next: Landing Page</Button>
          </div>
        )}
      </div>
    )}

    {/* Landing Page */}
    {currentStep === 'landing' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 4: Generate Landing Page (Nano Banana)</h2>
        <p className="text-gray-600">Nano Banana will create a compelling landing page for your SaaS.</p>
        <Button onClick={handleGenerateLandingPage} disabled={loading}>Generate Landing Page</Button>
        {landingPage && (
          <div className="mt-4 p-4 border border-green-200 rounded-md bg-green-50">
            <h3 className="font-semibold text-green-800">Landing Page Content Generated!</h3>
            <p className="text-sm text-green-700">Headline: {landingPage.hero.headline}</p>
            <p className="text-sm text-green-700">Features: {landingPage.features.length}</p>
            <Button onClick={() => setCurrentStep('growth')} className="mt-4">Next: Growth Plan</Button>
          </div>
        )}
      </div>
    )}

    {/* Growth Plan */}
    {currentStep === 'growth' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 5: Generate Growth Plan (Growth Hacker Agent)</h2>
        <p className="text-gray-600">Growth Hacker Agent will create SEO, social media, and email strategies.</p>
        <Button onClick={handleGenerateGrowthPlan} disabled={loading}>Generate Growth Plan</Button>
        {growthPlan && (
          <div className="mt-4 p-4 border border-blue-200 rounded-md bg-blue-50">
            <h3 className="font-semibold text-blue-800">Growth Plan Generated!</h3>
            <p className="text-sm text-blue-700">SEO Title: {growthPlan.seo.metaTitle}</p>
            <p className="text-sm text-blue-700">Social Posts: {growthPlan.socialMediaPosts.length}</p>
            <Button onClick={() => setCurrentStep('compliance')} className="mt-4">Next: Compliance Checks</Button>
          </div>
        )}
      </div>
    )}

    {/* Compliance Checks */}
    {currentStep === 'compliance' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 6: Run Compliance Checks (Compliance Checker)</h2>
        <p className="text-gray-600">Compliance Checker will ensure your SaaS meets industry standards (GDPR, SOC2, etc.).</p>
        <Button onClick={handleRunComplianceChecks} disabled={loading}>Run Checks</Button>
        {complianceChecks && (
          <div className="mt-4 p-4 border rounded-md bg-yellow-50">
            <h3 className="font-semibold">Compliance Check Results:</h3>
            <ul className="list-disc pl-5 text-sm">
              {complianceChecks.map((check, index) => (
                <li key={index} className={check.status === 'fail' ? 'text-red-700' : check.status === 'warning' ? 'text-orange-700' : 'text-green-700'}>
                  [{check.status.toUpperCase()}] {check.rule}: {check.message}
                </li>
              ))}
            </ul>
            <Button onClick={() => setCurrentStep('qa')} className="mt-4">Next: QA Tests</Button>
          </div>
        )}
      </div>
    )}

    {/* QA Tests */}
    {currentStep === 'qa' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 7: Generate & Run QA Tests (QA Agent)</h2>
        <p className="text-gray-600">QA Agent will generate Playwright tests to ensure your SaaS is bug-free.</p>
        <Button onClick={handleRunQaTests} disabled={loading || !appName}>Generate & Run Tests</Button>
        {qaResults && (
          <div className="mt-4 p-4 border rounded-md bg-purple-50">
            <h3 className="font-semibold">QA Test Results:</h3>
            <pre className="bg-gray-100 p-2 rounded-md text-sm overflow-x-auto">{JSON.stringify(qaResults, null, 2)}</pre>
            <Button onClick={() => setCurrentStep('legal')} className="mt-4">Next: Legal Documents</Button>
          </div>
        )}
      </div>
    )}

    {/* Legal Documents */}
    {currentStep === 'legal' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 8: Generate Legal Documents (Legal Agent)</h2>
        <p className="text-gray-600">Legal Agent will generate GDPR-compliant Privacy Policy, Terms of Service, and DPA.</p>
        <Button onClick={handleGenerateLegalDocs} disabled={loading || !appName}>Generate Legal Docs</Button>
        {legalDocs && (
          <div className="mt-4 p-4 border rounded-md bg-orange-50">
            <h3 className="font-semibold">Generated Legal Documents:</h3>
            <ul className="list-disc pl-5 text-sm">
              {legalDocs.map((doc, index) => (
                <li key={index} className="text-orange-700">
                  [{doc.type.toUpperCase()}] Last Updated: {new Date(doc.lastUpdated).toLocaleDateString()}
                </li>
              ))}
            </ul>
            <Button onClick={() => setCurrentStep('deploy')} className="mt-4">Next: Deploy</Button>
          </div>
        )}
      </div>
    )}

    {/* Deploy */}
    {currentStep === 'deploy' && (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Step 9: Deploy to Production (Coolify Agent)</h2>
        <p className="text-gray-600">Coolify Agent will deploy your SaaS to your production environment.</p>
        <Button onClick={handleDeploy} disabled={loading || !theme || !blueprint}>Deploy SaaS</Button>
        {deploymentResult && (
          <div className="mt-4 p-4 border rounded-md bg-green-100">
            <h3 className="font-semibold">Deployment Result:</h3>
            <p className="text-sm text-green-800">{deploymentResult}</p>
            <Button onClick={() => setCurrentStep('complete')} className="mt-4">Finish</Button>
          </div>
        )}
      </div>
    )}

    {/* Complete */}
    {currentStep === 'complete' && (
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold text-green-600">SaaS Generation Complete!</h2>
        <p className="text-lg text-gray-700">Your SaaS has been successfully built, tested, and deployed.</p>
        <p className="text-sm text-gray-500">Check your Coolify dashboard for the live application.</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Start New SaaS</Button>
      </div>
    )}

    {/* War Room Messages */}
    <div className="mt-12 p-6 border rounded-lg bg-gray-50">
      <h2 className="text-xl font-semibold mb-4">AI War Room Communication Log</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto" ref={messagesEndRef}>
        {warRoomMessages.length === 0 && <p className="text-gray-500">No agent communication yet...</p>}
        {warRoomMessages.map((msg, index) => (
          <div key={index} className="flex items-start space-x-2">
            <span className="font-bold text-blue-600">[{msg.agent}]</span>
            <p className="text-gray-800">{msg.message}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);
}

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!theme || !blueprint) {
      setError('Theme and blueprint must be generated first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/deploy-coolify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: appName.toLowerCase().replace(/\s/g, '-'),
          gitRepository: `https://github.com/bojandek/saas-fact`,
          branch: 'main',
          environment: 'production',
          domain: `${appName.toLowerCase().replace(/\s/g, '-')}.saas-factory.dev`,
          context: currentAgentContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to deploy');
      const { message, messages, context } = await response.json();
      setDeploymentResult(message);
      setWarRoomMessages((prev) => [...prev, ...messages]);
      setCurrentAgentContext(context);
      setCurrentStep('complete');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-2">SaaS Factory Orchestrator</h1>
      <p className="text-gray-600 mb-8">Build, Market & Deploy: Describe → Design → Architecture → Content → Growth → Live</p>

      {/* Step Indicator */}
      <div className="flex justify-between mb-8 overflow-x-auto">
        {(["description", "theme", "blueprint", "landing", "growth", "compliance", "deploy", "complete"] as Step[]).map((step, idx) => (
          <div key={step} className="flex items-center flex-shrink-0">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                currentStep === step
                  ? 'bg-blue-500 text-white'
                  : ["description", "theme", "blueprint", "landing", "growth", "compliance", "deploy"].includes(step) && 
                    ["description", "theme", "blueprint", "landing", "growth", "compliance", "deploy", "complete"].indexOf(step) <= 
                    ["description", "theme", "blueprint", "landing", "growth", "compliance", "deploy", "complete"].indexOf(currentStep)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {idx + 1}
            </div>
            <span className="ml-2 text-xs font-medium whitespace-nowrap">{step.charAt(0).toUpperCase() + step.slice(1)}</span>
            {idx < 7 && <div className="w-4 h-1 bg-gray-300 mx-1 flex-shrink-0"></div>}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="p-6 border rounded-lg shadow-sm relative">
        {currentStep === 'description' && (
          <>
            <h2 className="text-2xl font-semibold mb-4">Step 1: Describe Your SaaS Idea</h2>
            <textarea
              value={saasDescription}
              onChange={(e) => setSaasDescription(e.target.value)}
              placeholder="E.g., 'A modern CRM for dentists with appointment scheduling, patient management, and billing.'"
              rows={5}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="App Name (e.g., 'DentistCRM')"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />            <Button onClick={handleGenerateTheme} disabled={loading || !saasDescription || !appName}>
              {loading ? 'Generating Theme...' : 'Generate Theme (Nano Banana)'}
            </Button>
            {warRoomMessages.length > 0 && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
                {warRoomMessages.map((msg, index) => (
                  <div key={index} className="text-sm mb-1">
                    <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )
            {warRoomMessages.length > 0 && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
                {warRoomMessages.map((msg, index) => (
                  <div key={index} className="text-sm mb-1">
                    <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </>
        )}

       {currentStep === 'theme' && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
              {warRoomMessages.map((msg, index) => (
                <div key={index} className="text-sm mb-1">
                  <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}theme && (
          <>
            <h2 className="text-2xl font-semibold mb-4">Step 2: Your Generated Theme</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="font-medium">Primary Color:</p>
                <div className="flex items-center space-x-2">
                  <div style={{ backgroundColor: theme.primaryColor, width: '40px', height: '40px', borderRadius: '4px' }}></div>
                  <span>{theme.primaryColor}</span>
                </div>
              </div>
              <div>
                <p className="font-medium">Secondary Color:</p>
                <div className="flex items-center space-x-2">
                  <div style={{ backgroundColor: theme.secondaryColor, width: '40px', height: '40px', borderRadius: '4px' }}></div>
                  <span>{theme.secondaryColor}</span>
                </div>
              </div>
            </div>
                   <Button onClick={handleGenerateBlueprint} disabled={loading}>
              {loading ? 'Generating Blueprint...' : 'Generate Architecture (Architect Agent)'}
            </Button>
            {warRoomMessages.length > 0 && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
                {warRoomMessages.map((msg, index) => (
                  <div key={index} className="text-sm mb-1">
                    <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )n>
            {warRoomMessages.length > 0 && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
                {warRoomMessages.map((msg, index) => (
                  <div key={index} className="text-sm mb-1">
                    <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </>
        )}

       {currentStep === 'blueprint' && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
              {warRoomMessages.map((msg, index) => (
                <div key={index} className="text-sm mb-1">
                  <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}blueprint && (
          <>
            <h2 className="text-2xl font-semibold mb-4">Step 3: Your Generated Blueprint</h2>
            <p className="text-gray-600 mb-4">✓ Database schema, API spec, and RLS policies generated</p>
                  <Button onClick={handleGenerateLandingPage} disabled={loading}>
              {loading ? 'Generating Landing Page...' : 'Generate Landing Page'}
            </Button>
            {warRoomMessages.length > 0 && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
                {warRoomMessages.map((msg, index) => (
                  <div key={index} className="text-sm mb-1">
                    <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )on>
            {warRoomMessages.length > 0 && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
                {warRoomMessages.map((msg, index) => (
                  <div key={index} className="text-sm mb-1">
                    <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </>
        )}

       {currentStep === 'landing' && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
              {warRoomMessages.map((msg, index) => (
                <div key={index} className="text-sm mb-1">
                  <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}landingPage && (
          <>
            <h2 className="text-2xl font-semibold mb-4">Step 4: Your Landing Page</h2>
            <p className="text-gray-600 mb-4">✓ Hero, Features, Pricing & Testimonials generated</p>
            <p><strong>Headline:</strong> {landingPage.hero.headline}</p>
                    <Button onClick={handleGenerateGrowthPlan} disabled={loading} className="mt-4">
              {loading ? 'Generating Growth Plan...' : 'Generate Growth Plan'}
            </Button>
            {warRoomMessages.length > 0 && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
                {warRoomMessages.map((msg, index) => (
                  <div key={index} className="text-sm mb-1">
                    <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )on>
            {warRoomMessages.length > 0 && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
                {warRoomMessages.map((msg, index) => (
                  <div key={index} className="text-sm mb-1">
                    <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </>
        )}

        {currentStep === 'qa' && (
          <>
            <h2 className="text-2xl font-semibold mb-4">Step 7: Quality Assurance</h2>
            <p className="text-gray-600 mb-4">Running automated Playwright tests to ensure everything works as expected.</p>
            <Button onClick={handleRunQaTests} disabled={loading} className="mt-4">
              {loading ? 'Running QA Tests...' : 'Run QA Tests'}
            </Button>
            {qaResults && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <h3 className="font-bold">QA Test Summary:</h3>
                <p>{qaResults.testSummary}</p>
                <pre className="bg-gray-800 text-white p-2 rounded mt-2 overflow-x-auto">{qaResults.playwrightTests}</pre>
              </div>
            )}
          </>
        )}

        {currentStep === 'deploy' && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
              {warRoomMessages.map((msg, index) => (
                <div key={index} className="text-sm mb-1">
                  <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
              {warRoomMessages.map((msg, index) => (
                <div key={index} className="text-sm mb-1">
                  <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}rowthPlan && (
          <>
            <h2 className="text-2xl font-semibold mb-4">Step 5: Your Growth Plan</h2>
            <p className="text-gray-600 mb-4">✓ SEO, Social Media & Email Campaign generated</p>
            <p><strong>SEO Meta Title:</strong> {growthPlan.seo.metaTitle}</p>
            <p><strong>Social Posts:</strong> {growthPlan.socialMediaPosts.length} posts ready</p>
            <p><strong>Email Sequences:</strong> {growthPlan.emailCampaign.length} emails ready</p>
            <Button onClick={handleRunComplianceChecks} disabled={loading} className="mt-4">
              {loading ? 'Running Checks...' : 'Run Compliance Checks'}
            </Button>
            {warRoomMessages.length > 0 && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
                {warRoomMessages.map((msg, index) => (
                  <div key={index} className="text-sm mb-1">
                    <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )    </Button>
            {warRoomMessages.length > 0 && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
                {warRoomMessages.map((msg, index) => (
                  <div key={index} className="text-sm mb-1">
                    <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </>
        )}

       {currentStep === 'compliance' && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
              {warRoomMessages.map((msg, index) => (
                <div key={index} className="text-sm mb-1">
                  <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}complianceChecks && (
          <>
            <h2 className="text-2xl font-semibold mb-4">Step 6: Compliance & Best Practice Checks</h2>
            <div className="space-y-4">
              {complianceChecks.map((check, index) => (
                <div key={index} className="p-3 border rounded-md">
                  <p className="font-medium">Category: {check.category}</p>
                  <p>Status: <span className={`font-bold ${check.status === 'critical' ? 'text-red-500' : check.status === 'warning' ? 'text-yellow-500' : check.status === 'suggestion' ? 'text-blue-500' : 'text-green-500'}`}>{check.status.toUpperCase()}</span></p>
                  <p>Message: {check.message}</p>
                  {check.recommendations && check.recommendations.length > 0 && (
                    <div>
                      <p className="font-medium mt-2">Recommendations:</p>
                      <ul className="list-disc list-inside ml-4">
                        {check.recommendations.map((rec, recIdx) => (
                          <li key={recIdx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button onClick={(            <Button onClick={handleDeploy} disabled={loading} className="mt-4">
              {loading ? 'Deploying...' : 'Deploy to Coolify (Go Live)'}
            </Button>
            {warRoomMessages.length > 0 && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
                {warRoomMessages.map((msg, index) => (
                  <div key={index} className="text-sm mb-1">
                    <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )           {warRoomMessages.length > 0 && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
                {warRoomMessages.map((msg, index) => (
                  <div key={index} className="text-sm mb-1">
                    <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </>
        )}

        {currentStep === 'complete' && deploymentResult && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
            {warRoomMessages.map((msg, index) => (
              <div key={index} className="text-sm mb-1">
                <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )
          <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
            {warRoomMessages.map((msg, index) => (
              <div key={index} className="text-sm mb-1">
                <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
          {warRoomMessages.length > 0 && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2">Agent Communication Log</h3>
              {warRoomMessages.map((msg, index) => (
                <div key={index} className="text-sm mb-1">
                  <span className="font-bold">{msg.sender}</span> to <span className="font-bold">{msg.recipient}</span> ({msg.type}): {msg.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
          <>
            <h2 className="text-2xl font-semibold mb-4">✅ Your SaaS is Live!</h2>
            <p className="text-green-600 font-medium mb-4">{deploymentResult}</p>
            <p className="text-gray-600 mb-4">Your complete SaaS application is now deployed with:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
              <li>Unique UI theme (Nano Banana)</li>
              <li>Complete database schema (Architect)</li>
              <li>API specification (OpenAPI)</li>
              <li>RLS policies for multi-tenant security</li>
              <li>Landing page with marketing copy</li>
              <li>Growth plan (SEO, Social, Email)</li>
              <li>Live on Coolify infrastructure</li>
            </ul>
            <Button onClick={() => window.location.href = '/projects'}>
              View Your Projects
            </Button>
          </>
        )}

        {error && <p className="text-red-500 mt-4">Error: {error}</p>}
      </div>
    </div>
  );
}
