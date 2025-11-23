import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sales';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const format = searchParams.get('format') || 'json';

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

    let data;

    switch (type) {
      case 'sales':
        data = await getSalesReport(where);
        break;
      case 'stock':
        data = await getStockReport();
        break;
      case 'top-selling':
        data = await getTopSellingReport(where);
        break;
      case 'stock-movements':
        data = await getStockMovementsReport(where);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    if (format === 'csv') {
      return new NextResponse(generateCSV(data, type), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="report-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

async function getSalesReport(where: any) {
  const sales = await db.sale.findMany({
    where,
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
  });

  const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalTransactions = sales.length;
  const totalItems = sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.qty, 0), 0);

  const paymentMethodStats = sales.reduce((acc, sale) => {
    acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    summary: {
      totalAmount,
      totalTransactions,
      totalItems,
      paymentMethodStats,
      averageTransaction: totalTransactions > 0 ? totalAmount / totalTransactions : 0,
    },
    sales,
  };
}

async function getStockReport() {
  const products = await db.product.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      category: true,
      stock: true,
      sellingPrice: true,
      buyPrice: true,
      dateIn: true,
      dateOut: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  const totalProducts = products.length;
  const totalStockValue = products.reduce((sum, product) => sum + (product.stock * product.sellingPrice), 0);
  const totalStockItems = products.reduce((sum, product) => sum + product.stock, 0);
  const lowStockProducts = products.filter(product => product.stock < 10);
  const outOfStockProducts = products.filter(product => product.stock === 0);

  const categoryStats = products.reduce((acc, product) => {
    const category = product.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { count: 0, totalStock: 0, totalValue: 0 };
    }
    acc[category].count++;
    acc[category].totalStock += product.stock;
    acc[category].totalValue += product.stock * product.sellingPrice;
    return acc;
  }, {} as Record<string, { count: number; totalStock: number; totalValue: number }>);

  return {
    summary: {
      totalProducts,
      totalStockValue,
      totalStockItems,
      lowStockProducts: lowStockProducts.length,
      outOfStockProducts: outOfStockProducts.length,
      categoryStats,
    },
    products,
    lowStockProducts,
    outOfStockProducts,
  };
}

async function getTopSellingReport(where: any) {
  const topSellingProducts = await db.saleItem.groupBy({
    by: ['productId'],
    where: {
      sale: where,
    },
    _sum: {
      qty: true,
      subtotal: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _sum: {
        qty: 'desc',
      },
    },
    take: 20,
  });

  const productDetails = await Promise.all(
    topSellingProducts.map(async (item) => {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          sku: true,
          category: true,
          sellingPrice: true,
        },
      });
      return {
        ...product,
        totalSold: item._sum.qty || 0,
        totalRevenue: item._sum.subtotal || 0,
        transactionCount: item._count.id,
      };
    })
  );

  return {
    topProducts: productDetails,
  };
}

async function getStockMovementsReport(where: any) {
  const movements = await db.stockMovement.findMany({
    where,
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
  });

  const typeStats = movements.reduce((acc, movement) => {
    acc[movement.type] = (acc[movement.type] || 0) + movement.qty;
    return acc;
  }, {} as Record<string, number>);

  const totalMovements = movements.length;
  const totalQuantity = movements.reduce((sum, movement) => sum + movement.qty, 0);

  return {
    summary: {
      totalMovements,
      totalQuantity,
      typeStats,
    },
    movements,
  };
}

function generateCSV(data: any, type: string): string {
  let csv = '';
  let headers: string[] = [];
  let rows: any[] = [];

  switch (type) {
    case 'sales':
      headers = ['Invoice No', 'Date', 'Payment Method', 'Total Amount', 'Items Count', 'Cashier'];
      rows = data.sales.map((sale: any) => [
        sale.invoiceNo,
        new Date(sale.createdAt).toLocaleString('id-ID'),
        sale.paymentMethod,
        sale.totalAmount,
        sale.items.length,
        sale.user.name,
      ]);
      break;

    case 'stock':
      headers = ['SKU', 'Name', 'Category', 'Stock', 'Selling Price', 'Stock Value'];
      rows = data.products.map((product: any) => [
        product.sku,
        product.name,
        product.category || '',
        product.stock,
        product.sellingPrice,
        product.stock * product.sellingPrice,
      ]);
      break;

    case 'top-selling':
      headers = ['SKU', 'Name', 'Category', 'Total Sold', 'Total Revenue', 'Transaction Count'];
      rows = data.topProducts.map((product: any) => [
        product.sku,
        product.name,
        product.category || '',
        product.totalSold,
        product.totalRevenue,
        product.transactionCount,
      ]);
      break;

    case 'stock-movements':
      headers = ['Date', 'Type', 'Product', 'Quantity', 'Note', 'User'];
      rows = data.movements.map((movement: any) => [
        new Date(movement.createdAt).toLocaleString('id-ID'),
        movement.type,
        movement.product.name,
        movement.qty,
        movement.note || '',
        movement.user.name,
      ]);
      break;
  }

  csv += headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });

  return csv;
}