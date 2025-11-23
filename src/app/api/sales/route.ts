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
      paymentMethod,
      paidAmount,
    } = body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items wajib diisi dan tidak boleh kosong' },
        { status: 400 }
      );
    }

    if (!paymentMethod || !['CASH', 'TRANSFER'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Payment method harus CASH atau TRANSFER' },
        { status: 400 }
      );
    }

    if (paymentMethod === 'CASH' && (!paidAmount || paidAmount <= 0)) {
      return NextResponse.json(
        { error: 'Paid amount wajib diisi untuk pembayaran cash' },
        { status: 400 }
      );
    }

    // Validate items and check stock
    for (const item of items) {
      if (!item.productId || !item.qty || !item.unitPrice) {
        return NextResponse.json(
          { error: 'Setiap item harus memiliki productId, qty, dan unitPrice' },
          { status: 400 }
        );
      }

      if (item.qty <= 0 || item.unitPrice <= 0) {
        return NextResponse.json(
          { error: 'Qty dan unitPrice harus lebih besar dari 0' },
          { status: 400 }
        );
      }

      // Check product stock
      const product = await db.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Produk dengan ID ${item.productId} tidak ditemukan` },
          { status: 404 }
        );
      }

      if (product.stock < item.qty) {
        return NextResponse.json(
          { error: `Stok tidak mencukupi untuk ${product.name}. Stok tersedia: ${product.stock}` },
          { status: 400 }
        );
      }
    }

    // Generate invoice number
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const invoiceNo = `KAWOK-${dateStr}-${randomSuffix}`;

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);

    // Create sale and update stock in transaction
    const result = await db.$transaction(async (tx) => {
      // Create sale
      const sale = await tx.sale.create({
        data: {
          invoiceNo,
          totalAmount,
          paymentMethod,
          paidAmount: paymentMethod === 'CASH' ? paidAmount : null,
          changeAmount: paymentMethod === 'CASH' ? paidAmount - totalAmount : null,
          createdBy: userId,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Create sale items and update stock
      for (const item of items) {
        const subtotal = item.qty * item.unitPrice;

        // Create sale item
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            qty: item.qty,
            unitPrice: item.unitPrice,
            subtotal,
          },
        });

        // Update product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.qty,
            },
            dateOut: new Date(),
          },
        });

        // Create stock movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'OUT',
            qty: item.qty,
            note: `Penjualan - ${invoiceNo}`,
            referenceType: 'SALE',
            referenceId: sale.id,
            createdBy: userId,
          },
        });
      }

      return sale;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Sales POST error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
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
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate + 'T23:59:59.999Z');
      }
    }

    const [sales, total] = await Promise.all([
      db.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
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
      db.sale.count({ where }),
    ]);

    return NextResponse.json({
      sales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Sales GET error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}