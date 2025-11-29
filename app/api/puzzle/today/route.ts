import { NextResponse } from 'next/server';
import { getTodaysPuzzle } from '@/lib/googleSheets';

export async function GET() {
  try {
    const result = await getTodaysPuzzle();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching today\'s puzzle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch puzzle' },
      { status: 500 }
    );
  }
}
