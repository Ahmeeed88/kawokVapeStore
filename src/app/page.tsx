'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  FileText, 
  Settings, 
  LogOut,
  Home,
  Calculator,
  ClipboardList
} from 'lucide-react';

interface DashboardData {
  todayTotal: number;
  todayTransactionCount: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    sku: string;
    stock: number;
  }>;
  totalProducts: number;
  totalStockValue: number;
  recentSales: Array<{
    id: string;
    invoiceNo: string;
    totalAmount: number;
    paymentMethod: string;
    createdAt: string;
  }>;
  topSellingProducts: Array<{
    id: string;
    name: string;
    sku: string;
    totalSold: number;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('Fetching dashboard data...');
      const response = await fetch('/api/dashboard');
      console.log('Dashboard response status:', response.status);
      
      if (response.ok) {
        const dashboardData = await response.json();
        console.log('Dashboard data received:', dashboardData);
        setData(dashboardData);
      } else {
        const errorData = await response.json();
        console.log('Dashboard error:', errorData);
        setError(errorData.error || 'Gagal memuat data dashboard');
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setError('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/' },
    { icon: Package, label: 'Produk', href: '/products' },
    { icon: ClipboardList, label: 'Mutasi Stok', href: '/stock-movements' },
    { icon: Calculator, label: 'POS / Kasir', href: '/pos' },
    { icon: FileText, label: 'Laporan', href: '/reports' },
    { icon: Settings, label: 'Pengaturan', href: '/settings' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-red-600 text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">KawokVapeStore</h1>
          <p className="text-sm text-gray-600">POS & Inventory System</p>
        </div>
        
        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Button
                key={item.href}
                variant={isActive ? "default" : "ghost"}
                className="w-full justify-start ml-4 mr-4 mb-2"
                onClick={() => router.push(item.href)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-64 p-4">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-600">Ringkasan bisnis Anda</p>
        </div>

        {data && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Penjualan Hari Ini</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(data.todayTotal)}</div>
                  <p className="text-xs text-muted-foreground">
                    {data.todayTransactionCount} transaksi
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">
                    Aktif di database
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Nilai Stok</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(data.totalStockValue)}</div>
                  <p className="text-xs text-muted-foreground">
                    Total nilai inventory
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stok Rendah</CardTitle>
                  <Badge variant="destructive">
                    {data.lowStockProducts.length}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {data.lowStockProducts.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Produk perlu restock
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Low Stock Alert */}
              <Card>
                <CardHeader>
                  <CardTitle>Peringatan Stok Rendah</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.lowStockProducts.length === 0 ? (
                    <p className="text-gray-500">Tidak ada produk dengan stok rendah</p>
                  ) : (
                    <div className="space-y-2">
                      {data.lowStockProducts.map((product) => (
                        <div key={product.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                          </div>
                          <Badge variant="destructive">{product.stock} pcs</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Sales */}
              <Card>
                <CardHeader>
                  <CardTitle>Penjualan Terakhir</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.recentSales.length === 0 ? (
                    <p className="text-gray-500">Belum ada transaksi hari ini</p>
                  ) : (
                    <div className="space-y-2">
                      {data.recentSales.map((sale) => (
                        <div key={sale.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{sale.invoiceNo}</p>
                            <p className="text-sm text-gray-600">{formatDate(sale.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(sale.totalAmount)}</p>
                            <Badge variant={sale.paymentMethod === 'CASH' ? 'default' : 'secondary'}>
                              {sale.paymentMethod}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Selling Products */}
              <Card>
                <CardHeader>
                  <CardTitle>Produk Terlaris (Bulan Ini)</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.topSellingProducts.length === 0 ? (
                    <p className="text-gray-500">Belum ada penjualan bulan ini</p>
                  ) : (
                    <div className="space-y-2">
                      {data.topSellingProducts.map((product, index) => (
                        <div key={product.id} className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <div>
                            <p className="font-medium">#{index + 1} {product.name}</p>
                            <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                          </div>
                          <Badge variant="default">{product.totalSold} terjual</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}