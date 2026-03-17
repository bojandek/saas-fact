import { useState } from 'react';
import { Button } from '@saas-factory/ui';

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

export default function GrowthHackerPage() {
  const [description, setDescription] = useState('');
  const [growthPlan, setGrowthPlan] = useState<GrowthPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateGrowthPlan = async () => {
    setLoading(true);
    setError(null);
    setGrowthPlan(null);
    try {
      const response = await fetch('/api/generate-growth-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate growth plan');
      }

      const data: GrowthPlan = await response.json();
      setGrowthPlan(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">AI Growth Hacker Agent</h1>

      <div className="mb-8 p-6 border rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Generate Growth Plan</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your SaaS for the growth plan (e.g., 'A project management tool for small teams, focusing on simplicity and collaboration.')"
          rows={5}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <Button onClick={handleGenerateGrowthPlan} disabled={loading || !description}>
          {loading ? 'Generating...' : 'Generate Growth Plan'}
        </Button>
        {error && <p className="text-red-500 mt-2">Error: {error}</p>}
      </div>

      {growthPlan && (
        <div className="p-6 border rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Generated Growth Plan</h2>
          <div className="space-y-6">
            {/* SEO Section */}
            <div>
              <h3 className="text-xl font-semibold mb-2">SEO Strategy</h3>
              <p><strong>Meta Title:</strong> {growthPlan.seo.metaTitle}</p>
              <p><strong>Meta Description:</strong> {growthPlan.seo.metaDescription}</p>
              <p><strong>Keywords:</strong> {growthPlan.seo.keywords.join(', ')}</p>
            </div>

            {/* Social Media Posts */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Social Media Posts</h3>
              {growthPlan.socialMediaPosts.map((post, index) => (
                <div key={index} className="mb-4 p-3 border rounded-md">
                  <p><strong>Platform:</strong> {post.platform}</p>
                  <p><strong>Content:</strong> {post.content}</p>
                  <p><strong>Hashtags:</strong> {post.hashtags.join(', ')}</p>
                </div>
              ))}
            </div>

            {/* Email Campaign */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Email Campaign</h3>
              {growthPlan.emailCampaign.map((email, index) => (
                <div key={index} className="mb-4 p-3 border rounded-md">
                  <p><strong>Subject:</strong> {email.subject}</p>
                  <p><strong>Body:</strong> {email.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
