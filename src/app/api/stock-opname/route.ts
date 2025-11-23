import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
      items,
      confirmAdjustment,
    } = body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items wajib diisi dan tidak boleh kosong' },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.productId || item.countedQty === undefined) {
        return NextResponse.json(
          { error: 'Setiap item harus memiliki productId dan countedQty' },
          { status: 400 }
        );
      }

      if (item.countedQty < 0) {
        return NextResponse.json(
          { error: 'Counted qty tidak boleh negatif' },
          { status: 400 }
        );
      }
    }

    // Create stock opname and optionally adjust stock in transaction
    const result = await db.$transaction(async (tx) => {
      // Create stock opname
      const stockOpname = await tx.stockOpname.create({
        data: {
          performedBy: userId,
          date: new Date(),
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      });

      // Create stock opname items
      const opnameItems = await Promise.all(
        items.map(async (item) => {
          // Get current product stock
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
          }

          const systemQty = product.stock;
          const countedQty = item.countedQty;
          const diff = countedQty - systemQty;

          // Create stock opname item
          const opnameItem = await tx.stockOpnameItem.create({
            data: {
              stockOpnameId: stockOpname.id,
              productId: item.productId,
              countedQty,
              systemQty,
              diff,
            },
            include: {
              product: true,
            },
          });

          // If confirmed adjustment, create stock movement and update product stock
          if (confirmAdjustment && diff !== 0) {
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: 'ADJUST',
                qty: Math.abs(diff),
                note: `Stock opname adjustment - Opname #${stockOpname.id}`,
                referenceType: 'STOCK_OPNAME',
                referenceId: stockOpname.id,
                createdBy: userId,
              },
            });

            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: countedQty,
              },
            });
          }

          return opnameItem;
        })
      );

      return {
        ...stockOpname,
        items: opnameItems,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Stock opname POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';

    const skip = (page - 1) * limit;

    const where: any = {};

    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) {
        where.date.gte = new Date(fromDate);
      }
      if (toDate) {
        where.date.lte = new Date(toDate + 'T23:59:59.999Z');
      }
    }

    const [stockOpnames, total] = await Promise.all([
      db.stockOpname.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          date: 'desc',
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
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
      db.stockOpname.count({ where }),
    ]);

    return NextResponse.json({
      stockOpnames,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Stock opname GET error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}