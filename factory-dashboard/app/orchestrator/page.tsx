'use client'

import { useState } from 'react';
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

type Step = 'description' | 'theme' | 'blueprint' | 'assemble' | 'complete';

export default function OrchestratorPage() {
  const [currentStep, setCurrentStep] = useState<Step>('description');
  const [saasDescription, setSaasDescription] = useState('');
  const [appName, setAppName] = useState('');
  const [theme, setTheme] = useState<GeneratedTheme | null>(null);
  const [blueprint, setBlueprint] = useState<ArchitectBlueprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assemblyResult, setAssemblyResult] = useState<string | null>(null);

  const handleGenerateTheme = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: saasDescription }),
      });

      if (!response.ok) throw new Error('Failed to generate theme');
      const data = await response.json();
      setTheme(data);
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
        body: JSON.stringify({ description: saasDescription }),
      });

      if (!response.ok) throw new Error('Failed to generate blueprint');
      const data = await response.json();
      setBlueprint(data);
      setCurrentStep('assemble');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssemble = async () => {
    if (!theme || !blueprint) {
      setError('Theme and blueprint must be generated first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/assemble-saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName,
          saasDescription,
          theme,
          blueprint,
        }),
      });

      if (!response.ok) throw new Error('Failed to assemble SaaS');
      const data = await response.json();
      setAssemblyResult(data.message);
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
      <p className="text-gray-600 mb-8">Build a complete SaaS in minutes: Describe → Design → Architecture → Code</p>

      {/* Step Indicator */}
      <div className="flex justify-between mb-8">
        {(['description', 'theme', 'blueprint', 'assemble', 'complete'] as Step[]).map((step, idx) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep === step
                  ? 'bg-blue-500 text-white'
                  : ['description', 'theme', 'blueprint', 'assemble'].includes(step) && 
                    ['description', 'theme', 'blueprint', 'assemble', 'complete'].indexOf(step) <= 
                    ['description', 'theme', 'blueprint', 'assemble', 'complete'].indexOf(currentStep)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {idx + 1}
            </div>
            <span className="ml-2 text-sm font-medium">{step.charAt(0).toUpperCase() + step.slice(1)}</span>
            {idx < 4 && <div className="w-8 h-1 bg-gray-300 mx-2"></div>}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="p-6 border rounded-lg shadow-sm">
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
            />
            <Button onClick={handleGenerateTheme} disabled={loading || !saasDescription || !appName}>
              {loading ? 'Generating Theme...' : 'Generate Theme (Nano Banana)'}
            </Button>
          </>
        )}

        {currentStep === 'theme' && theme && (
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
              <div>
                <p className="font-medium">Accent Color:</p>
                <div className="flex items-center space-x-2">
                  <div style={{ backgroundColor: theme.accentColor, width: '40px', height: '40px', borderRadius: '4px' }}></div>
                  <span>{theme.accentColor}</span>
                </div>
              </div>
              <div>
                <p className="font-medium">Font Family:</p>
                <span>{theme.fontFamily}</span>
              </div>
            </div>
            <Button onClick={handleGenerateBlueprint} disabled={loading}>
              {loading ? 'Generating Blueprint...' : 'Generate Architecture (Architect Agent)'}
            </Button>
          </>
        )}

        {currentStep === 'blueprint' && blueprint && (
          <>
            <h2 className="text-2xl font-semibold mb-4">Step 3: Your Generated Blueprint</h2>
            <div className="space-y-4 mb-4">
              <div>
                <p className="font-medium mb-2">SQL Schema:</p>
                <pre className="bg-gray-100 p-3 rounded-md overflow-auto text-xs max-h-40">
                  <code>{blueprint.sqlSchema}</code>
                </pre>
              </div>
              <div>
                <p className="font-medium mb-2">API Spec (OpenAPI):</p>
                <pre className="bg-gray-100 p-3 rounded-md overflow-auto text-xs max-h-40">
                  <code>{blueprint.apiSpec}</code>
                </pre>
              </div>
            </div>
            <Button onClick={handleAssemble} disabled={loading}>
              {loading ? 'Assembling...' : 'Assemble SaaS (The Assembler)'}
            </Button>
          </>
        )}

        {currentStep === 'complete' && assemblyResult && (
          <>
            <h2 className="text-2xl font-semibold mb-4">✅ Your SaaS is Ready!</h2>
            <p className="text-green-600 font-medium mb-4">{assemblyResult}</p>
            <p className="text-gray-600 mb-4">Your new SaaS application has been generated with:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
              <li>Unique UI theme (Nano Banana)</li>
              <li>Complete database schema (Architect)</li>
              <li>API specification (OpenAPI)</li>
              <li>RLS policies for multi-tenant security</li>
              <li>Scaffolded code ready for deployment</li>
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
