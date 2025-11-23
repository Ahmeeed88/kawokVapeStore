import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await db.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Product GET error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if product exists
    const existingProduct = await db.product.findUnique({
      where: { id: params.id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if SKU is used by another product
    const skuConflict = await db.product.findFirst({
      where: {
        sku,
        id: { not: params.id },
      },
    });

    if (skuConflict) {
      return NextResponse.json(
        { error: 'SKU sudah digunakan oleh produk lain' },
        { status: 400 }
      );
    }

    const oldStock = existingProduct.stock;
    const stockDifference = stock - oldStock;

    const product = await db.product.update({
      where: { id: params.id },
      data: {
        sku,
        name,
        description,
        category,
        buyPrice: buyPrice || null,
        sellingPrice,
        stock,
        imagePath,
      },
    });

    // Create stock movement if stock changed
    if (stockDifference !== 0) {
      await db.stockMovement.create({
        data: {
          productId: product.id,
          type: stockDifference > 0 ? 'IN' : 'OUT',
          qty: Math.abs(stockDifference),
          note: `Penyesuaian stok dari ${oldStock} menjadi ${stock}`,
          createdBy: userId,
        },
      });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Product PUT error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if product exists
    const existingProduct = await db.product.findUnique({
      where: { id: params.id },
      include: {
        saleItems: true,
        stockMovements: true,
        stockOpnameItems: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if product has sales
    if (existingProduct.saleItems.length > 0) {
      return NextResponse.json(
        { error: 'Produk tidak dapat dihapus karena sudah ada transaksi penjualan' },
        { status: 400 }
      );
    }

    // Delete product and related records
    await db.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Produk berhasil dihapus' });
  } catch (error) {
    console.error('Product DELETE error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}