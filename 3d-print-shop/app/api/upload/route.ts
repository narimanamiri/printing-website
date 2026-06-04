import { writeFile, mkdir } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { parseFormData } from '@/lib/form-parser';
import { parseSTLFile, calculateCost } from '@/lib/stl-parser';
import { createOrder } from '@/lib/db';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const email = formData.get('email') as string;

    if (!file || !email) {
      return NextResponse.json(
        { error: 'Missing file or email' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.stl')) {
      return NextResponse.json(
        { error: 'Only STL files are accepted' },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const bufferBytes = Buffer.from(buffer);

    // Parse STL file
    const stlData = await parseSTLFile(bufferBytes);
    const cost = calculateCost(stlData.estimatedWeight);

    // Save file
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const filename = `${uuidv4()}-${file.name}`;
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, bufferBytes);

    // Create order
    const order = createOrder({
      email,
      filename,
      filesize: bufferBytes.length,
      weight: stlData.estimatedWeight,
      cost,
      status: 'pending',
      stripe_payment_intent: null,
      notes: null,
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      filename: file.name,
      weight: stlData.estimatedWeight,
      cost,
      volume: stlData.volume,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
}
