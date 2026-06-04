import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders, getOrdersByStatus, updateOrderStatus, confirmOrder, getOrder } from '@/lib/db';
import { copyFile, mkdir } from 'fs/promises';
import path from 'path';

// Simple auth check - in production use proper authentication
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  // For demo: check if authorization header contains a token
  // In production, verify JWT or session
  return authHeader === 'Bearer admin-secret-key' || process.env.NODE_ENV === 'development';
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const status = request.nextUrl.searchParams.get('status');

    let orders;
    if (status) {
      orders = getOrdersByStatus(status);
    } else {
      orders = getAllOrders();
    }

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Failed to get orders' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const order = getOrder(orderId);
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (status === 'confirmed') {
      confirmOrder(orderId);
    } else {
      updateOrderStatus(orderId, status);
    }

    // If confirmed, move file to print queue
    if (status === 'confirmed') {
      try {
        const sourceDir = path.join(process.cwd(), 'public', 'uploads');
        const destDir = path.join(process.cwd(), 'public', 'print-queue');
        await mkdir(destDir, { recursive: true });

        const sourcePath = path.join(sourceDir, order.filename);
        const destPath = path.join(destDir, order.filename);
        
        await copyFile(sourcePath, destPath);
      } catch (err) {
        console.error('Failed to move file to print queue:', err);
      }
    }

    const updatedOrder = getOrder(orderId);

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
