import { useState } from 'react';
import { Button } from '@saas-factory/ui';

interface GeneratedTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: string;
}

export default function ThemeGeneratorPage() {
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState<GeneratedTheme | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateTheme = async () => {
    setLoading(true);
    setError(null);
    setTheme(null);
    try {
      const response = await fetch('/api/generate-theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate theme');
      }

      const data: GeneratedTheme = await response.json();
      setTheme(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Nano Banana UI Engine</h1>

      <div className="mb-8 p-6 border rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Generate a New Theme</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your SaaS idea (e.g., 'A modern CRM for dentists with a clean, professional look.')"
          rows={5}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <Button onClick={handleGenerateTheme} disabled={loading || !description}>
          {loading ? 'Generating...' : 'Generate Theme'}
        </Button>
        {error && <p className="text-red-500 mt-2">Error: {error}</p>}
      </div>

      {theme && (
        <div className="p-6 border rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Generated Theme</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Primary Color:</p>
              <div className="flex items-center space-x-2">
                <div style={{ backgroundColor: theme.primaryColor, width: '30px', height: '30px', borderRadius: '4px' }}></div>
                <span>{theme.primaryColor}</span>
              </div>
            </div>
            <div>
              <p className="font-medium">Secondary Color:</p>
              <div className="flex items-center space-x-2">
                <div style={{ backgroundColor: theme.secondaryColor, width: '30px', height: '30px', borderRadius: '4px' }}></div>
                <span>{theme.secondaryColor}</span>
              </div>
            </div>
            <div>
              <p className="font-medium">Accent Color:</p>
              <div className="flex items-center space-x-2">
                <div style={{ backgroundColor: theme.accentColor, width: '30px', height: '30px', borderRadius: '4px' }}></div>
                <span>{theme.accentColor}</span>
              </div>
            </div>
            <div>
              <p className="font-medium">Font Family:</p>
              <span>{theme.fontFamily}</span>
            </div>
            <div>
              <p className="font-medium">Border Radius:</p>
              <span>{theme.borderRadius}</span>
            </div>
          </div>
          <p className="mt-4 text-gray-600">You can now use these values to update your `tailwind.config.ts` and `design-tokens.ts`.</p>
        </div>
      )}
    </div>
  );
}
