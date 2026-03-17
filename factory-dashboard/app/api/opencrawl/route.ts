import { NextResponse } from 'next/server';
import { RAGSystem } from '../../../../factory-brain/src/rag';

export async function POST(request: Request) {
  try {
    const { query, category, limit } = await request.json();

    if (!query || !category) {
      return NextResponse.json({ error: 'Missing required parameters: query, category' }, { status: 400 });
    }

    const ragSystem = new RAGSystem();
    await ragSystem.crawlAndStore(query, category, limit);

    return NextResponse.json({ message: `Successfully crawled and stored documents for query: ${query} in category: ${category}` });
  } catch (error) {
    console.error('OpenCrawl API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
