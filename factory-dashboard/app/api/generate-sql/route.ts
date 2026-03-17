import { NextResponse } from 'next/server';
import { SqlGenerator } from '../../../../factory-brain/src/sql-generator';

export async function POST(request: Request) {
  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json({ error: 'Description parameter is missing' }, { status: 400 });
    }

    const sqlGenerator = new SqlGenerator();
    const sqlSchema = await sqlGenerator.generateSqlSchema(description);

    return NextResponse.json({ sql: sqlSchema });
  } catch (error) {
    console.error('SQL Generation API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
