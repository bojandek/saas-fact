import { useState } from 'react';
import { Button } from '@saas-factory/ui';

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

export default function LandingPageGeneratorPage() {
  const [description, setDescription] = useState('');
  const [content, setContent] = useState<LandingPageContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateContent = async () => {
    setLoading(true);
    setError(null);
    setContent(null);
    try {
      const response = await fetch('/api/generate-landing-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate landing page content');
      }

      const data: LandingPageContent = await response.json();
      setContent(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Nano Banana Landing Page Generator</h1>

      <div className="mb-8 p-6 border rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Generate Landing Page Content</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your SaaS idea for the landing page (e.g., 'A project management tool for small teams, focusing on simplicity and collaboration.')"
          rows={5}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <Button onClick={handleGenerateContent} disabled={loading || !description}>
          {loading ? 'Generating...' : 'Generate Landing Page Content'}
        </Button>
        {error && <p className="text-red-500 mt-2">Error: {error}</p>}
      </div>

      {content && (
        <div className="p-6 border rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Generated Landing Page Content</h2>
          <div className="space-y-6">
            {/* Hero Section */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Hero Section</h3>
              <p><strong>Headline:</strong> {content.hero.headline}</p>
              <p><strong>Subheadline:</strong> {content.hero.subheadline}</p>
              <p><strong>Call to Action:</strong> {content.hero.callToAction}</p>
            </div>

            {/* Features Section */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Features</h3>
              {content.features.map((feature, index) => (
                <div key={index} className="mb-2">
                  <p><strong>{feature.title}:</strong> {feature.description}</p>
                </div>
              ))}
            </div>

            {/* Pricing Section */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Pricing</h3>
              {content.pricing.map((plan, index) => (
                <div key={index} className="mb-4 p-3 border rounded-md">
                  <p><strong>Plan:</strong> {plan.planName}</p>
                  <p><strong>Price:</strong> {plan.price}</p>
                  <p><strong>Features:</strong> {plan.features.join(', ')}</p>
                  <p><strong>Call to Action:</strong> {plan.callToAction}</p>
                </div>
              ))}
            </div>

            {/* Testimonials Section */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Testimonials</h3>
              {content.testimonials.map((testimonial, index) => (
                <div key={index} className="mb-2">
                  <p>"<em>{testimonial.quote}</em>"</p>
                  <p>- {testimonial.author}, {testimonial.company}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
