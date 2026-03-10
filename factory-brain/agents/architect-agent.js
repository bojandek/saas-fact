import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function architectAgent(prompt) {
  const response = await client.messages.create({
    model: 'claude-3.5-sonnet-20240620',
    max_tokens: 1024,
    messages: [{ role: 'user', content: `Architect SaaS: ${prompt}` }]
  });
  return response.content[0].text;
}