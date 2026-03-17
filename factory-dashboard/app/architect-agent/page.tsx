import { useState } from 'react';
import { Button } from '@saas-factory/ui';

interface ArchitectBlueprint {
  sqlSchema: string;
  apiSpec: string;
  rlsPolicies: string;
}

export default function ArchitectAgentPage() {
  const [description, setDescription] = useState('');
  const [blueprint, setBlueprint] = useState<ArchitectBlueprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateBlueprint = async () => {
    setLoading(true);
    setError(null);
    setBlueprint(null);
    try {
      const response = await fetch('/api/architect-blueprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate blueprint');
      }

      const data: ArchitectBlueprint = await response.json();
      setBlueprint(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Architect Agent (SaaS Blueprint Generator)</h1>

      <div className="mb-8 p-6 border rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Generate SaaS Blueprint</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your SaaS idea (e.g., 'A project management tool with tasks, users, and teams.')"
          rows={5}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <Button onClick={handleGenerateBlueprint} disabled={loading || !description}>
          {loading ? 'Generating...' : 'Generate Blueprint'}
        </Button>
        {error && <p className="text-red-500 mt-2">Error: {error}</p>}
      </div>

      {blueprint && (
        <div className="space-y-8">
          <div className="p-6 border rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">Generated SQL Schema</h2>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
              <code>{blueprint.sqlSchema}</code>
            </pre>
          </div>

          <div className="p-6 border rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">Generated OpenAPI Specification (YAML)</h2>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
              <code>{blueprint.apiSpec}</code>
            </pre>
          </div>

          <div className="p-6 border rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">Generated RLS Policies</h2>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
              <code>{blueprint.rlsPolicies}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
