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

type Step = 'description' | 'theme' | 'blueprint' | 'landing' | 'growth' | 'compliance' | 'qa' | 'deploy' | 'complete';

export default function OrchestratorPage() {
  const [currentStep, setCurrentStep] = useState<Step>('description');
  const [saasDescription, setSaasDescription] = useState('');
  const [appName, setAppName] = useState('');
  const [theme, setTheme] = useState<GeneratedTheme | null>(null);
  const [blueprint, setBlueprint] = useState<ArchitectBlueprint | null>(null);
  const [landingPage, setLandingPage] = useState<LandingPageContent | null>(null);
  const [growthPlan, setGrowthPlan] = useState<GrowthPlan | null>(null);
  const [complianceChecks, setComplianceChecks] = useState<any[] | null>(null);
  const [qaResults, setQaResults] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setCurrentStep("deploy");
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
