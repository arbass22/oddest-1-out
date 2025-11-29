import { NextResponse } from 'next/server';
import { getRandomPastPuzzle } from '@/lib/googleSheets';

export async function GET() {
  try {
    const result = await getRandomPastPuzzle();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching random puzzle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch puzzle' },
      { status: 500 }
    );
  }
}
