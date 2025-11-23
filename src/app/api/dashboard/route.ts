import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('Dashboard API called');
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    console.log('Fetching today sales...');
    // Get today's sales
    const todaySales = await db.sale.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log('Found today sales:', todaySales.length);

    // Calculate today's total
    const todayTotal = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    // Get today's transaction count
    const todayTransactionCount = todaySales.length;

    console.log('Fetching low stock products...');
    // Get low stock products (stock < 10)
    const lowStockProducts = await db.product.findMany({
      where: {
        stock: {
          lt: 10,
        },
      },
      orderBy: {
        stock: 'asc',
      },
      take: 10,
    });

    console.log('Found low stock products:', lowStockProducts.length);

    // Get total products count
    const totalProducts = await db.product.count();

    console.log('Total products:', totalProducts);

    // Get total stock value
    const products = await db.product.findMany({
      select: {
        stock: true,
        sellingPrice: true,
      },
    });

    const totalStockValue = products.reduce((sum, product) => sum + (product.stock * product.sellingPrice), 0);

    console.log('Fetching recent sales...');
    // Get recent sales (last 5)
    const recentSales = await db.sale.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log('Found recent sales:', recentSales.length);

    console.log('Fetching top selling products...');
    // Get top selling products (this month)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const topSellingProducts = await db.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      },
      _sum: {
        qty: true,
      },
      orderBy: {
        _sum: {
          qty: 'desc',
        },
      },
      take: 5,
    });

    console.log('Found top selling products:', topSellingProducts.length);

    const topProductsWithDetails = await Promise.all(
      topSellingProducts.map(async (item) => {
        const product = await db.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            sku: true,
          },
        });
        return {
          ...product,
          totalSold: item._sum.qty || 0,
        };
      })
    );

    console.log('Dashboard data prepared successfully');

    return NextResponse.json({
      todayTotal,
      todayTransactionCount,
      lowStockProducts,
      totalProducts,
      totalStockValue,
      recentSales,
      topSellingProducts: topProductsWithDetails,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}