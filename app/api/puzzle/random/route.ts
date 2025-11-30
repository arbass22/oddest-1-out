import { NextRequest, NextResponse } from 'next/server';
import { getRandomPastPuzzle } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  try {
    const clientDate = request.nextUrl.searchParams.get('date');
    const result = await getRandomPastPuzzle(clientDate);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching random puzzle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch puzzle' },
      { status: 500 }
    );
  }
}
