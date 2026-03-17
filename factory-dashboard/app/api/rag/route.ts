import { NextResponse } from 'next/server';
import { RAGSystem } from '../../../../factory-brain/src/rag';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is missing' }, { status: 400 });
    }

    const ragSystem = new RAGSystem();
    const results = await ragSystem.search(query);

    return NextResponse.json(results);
  } catch (error) {
    console.error('RAG API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
