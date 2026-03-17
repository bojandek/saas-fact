import { NextResponse } from 'next/server';
import { ThemeGenerator } from '../../../../packages/ui/src/lib/theme-generator';

export async function POST(request: Request) {
  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json({ error: 'Description parameter is missing' }, { status: 400 });
    }

    const themeGenerator = new ThemeGenerator();
    const theme = await themeGenerator.generateTheme(description);

    return NextResponse.json(theme);
  } catch (error) {
    console.error('Theme Generation API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
