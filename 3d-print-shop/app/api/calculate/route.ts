import { calculateCost } from '@/lib/stl-parser';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { weight } = await request.json();

    if (typeof weight !== 'number' || weight <= 0) {
      return NextResponse.json(
        { error: 'Invalid weight' },
        { status: 400 }
      );
    }

    const cost = calculateCost(weight);

    return NextResponse.json({
      success: true,
      weight,
      cost,
      pricePerGram: 30000,
    });
  } catch (error) {
    console.error('Calculate cost error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate cost' },
      { status: 500 }
    );
  }
}
