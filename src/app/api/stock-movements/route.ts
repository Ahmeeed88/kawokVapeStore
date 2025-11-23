import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type') || '';
    const productId = searchParams.get('productId') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';

    const skip = (page - 1) * limit;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (productId) {
      where.productId = productId;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate + 'T23:59:59.999Z');
      }
    }

    const [movements, total] = await Promise.all([
      db.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.stockMovement.count({ where }),
    ]);

    return NextResponse.json({
      movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Stock movements GET error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      productId,
      type,
      qty,
      note,
      referenceType,
      referenceId,
    } = body;

    // Validation
    if (!productId || !type || !qty) {
      return NextResponse.json(
        { error: 'Product, type, dan qty wajib diisi' },
        { status: 400 }
      );
    }

    if (!['IN', 'OUT', 'ADJUST'].includes(type)) {
      return NextResponse.json(
        { error: 'Type harus IN, OUT, atau ADJUST' },
        { status: 400 }
      );
    }

    if (qty <= 0) {
      return NextResponse.json(
        { error: 'Qty harus lebih besar dari 0' },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    // For OUT type, check if enough stock
    if (type === 'OUT' && product.stock < qty) {
      return NextResponse.json(
        { error: 'Stok tidak mencukupi' },
        { status: 400 }
      );
    }

    // Create stock movement and update product stock in transaction
    const result = await db.$transaction(async (tx) => {
      // Create stock movement
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type,
          qty,
          note,
          referenceType,
          referenceId,
          createdBy: userId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update product stock
      const stockChange = type === 'OUT' ? -qty : qty;
      await tx.product.update({
        where: { id: productId },
        data: {
          stock: {
            increment: stockChange,
          },
          dateOut: type === 'OUT' ? new Date() : product.dateOut,
        },
      });

      return movement;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Stock movements POST error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}