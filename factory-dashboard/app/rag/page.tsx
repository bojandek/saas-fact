import { useState } from 'react';
import { Button } from '@saas-factory/ui';

interface QueryResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
}

export default function RagPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Something went wrong');
      }

      const data: QueryResult[] = await response.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Factory Brain RAG Assistant</h1>
      <div className="flex space-x-4 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about your SaaS Factory..."
          className="flex-grow p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {error && <div className="text-red-500 mb-4">Error: {error}</div>}

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Results:</h2>
          {results.map((result) => (
            <div key={result.id} className="border rounded-lg p-4 shadow-sm">
              <h3 className="text-xl font-medium mb-2">{result.title}</h3>
              <p className="text-gray-700 mb-2">{result.content}</p>
              <p className="text-sm text-gray-500">Similarity: {(result.similarity * 100).toFixed(2)}%</p>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && !error && (
        <p className="text-gray-500">No results yet. Try asking a question!</p>
      )}
    </div>
  );
}
