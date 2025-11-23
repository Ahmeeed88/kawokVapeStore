import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      db.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Products GET error:', error);
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
      sku,
      name,
      description,
      category,
      buyPrice,
      sellingPrice,
      stock,
      imagePath,
    } = body;

    // Validation
    if (!sku || !name || sellingPrice === undefined || stock === undefined) {
      return NextResponse.json(
        { error: 'SKU, nama, harga jual, dan stok wajib diisi' },
        { status: 400 }
      );
    }

    if (sellingPrice < 0 || stock < 0) {
      return NextResponse.json(
        { error: 'Harga jual dan stok tidak boleh negatif' },
        { status: 400 }
      );
    }

    // Check if SKU already exists
    const existingProduct = await db.product.findUnique({
      where: { sku },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: 'SKU sudah digunakan' },
        { status: 400 }
      );
    }

    const product = await db.product.create({
      data: {
        sku,
        name,
        description,
        category,
        buyPrice: buyPrice || null,
        sellingPrice,
        stock,
        imagePath,
        dateIn: stock > 0 ? new Date() : null,
      },
    });

    // Create stock movement if stock > 0
    if (stock > 0) {
      await db.stockMovement.create({
        data: {
          productId: product.id,
          type: 'IN',
          qty: stock,
          note: 'Stok awal',
          createdBy: userId,
        },
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Products POST error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}