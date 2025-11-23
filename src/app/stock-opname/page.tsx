'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Search, 
  ClipboardList,
  Loader2,
  Package,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  stock: number;
}

interface OpnameItem {
  productId: string;
  countedQty: number;
  systemQty: number;
  diff: number;
  product: Product;
}

interface StockOpname {
  id: string;
  performedBy: string;
  date: string;
  createdAt: string;
  items: OpnameItem[];
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface OpnamesResponse {
  stockOpnames: StockOpname[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function StockOpnamePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [opnames, setOpnames] = useState<StockOpname[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmAdjustment, setConfirmAdjustment] = useState(false);
  
  const [selectedProducts, setSelectedProducts] = useState<{[key: string]: number}>({});

  useEffect(() => {
    fetchProducts();
    fetchOpnames();
  }, [currentPage]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchOpnames = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      const response = await fetch(`/api/stock-opname?${params}`);
      if (response.ok) {
        const data: OpnamesResponse = await response.json();
        setOpnames(data.stockOpnames);
        setTotalPages(data.pagination.pages);
      } else {
        setError('Gagal memuat data stock opname');
      }
    } catch (error) {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOpname = () => {
    setSelectedProducts({});
    setConfirmAdjustment(false);
    setIsCreateModalOpen(true);
  };

  const handleProductSelect = (productId: string, checked: boolean) => {
    if (checked) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProducts(prev => ({
          ...prev,
          [productId]: product.stock
        }));
      }
    } else {
      setSelectedProducts(prev => {
        const newSelected = { ...prev };
        delete newSelected[productId];
        return newSelected;
      });
    }
  };

  const handleCountedQtyChange = (productId: string, qty: string) => {
    const countedQty = parseInt(qty) || 0;
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: countedQty
    }));
  };

  const handleSubmitOpname = async () => {
    try {
      setSubmitting(true);
      setError('');

      const items = Object.entries(selectedProducts).map(([productId, countedQty]) => {
        const product = products.find(p => p.id === productId);
        return {
          productId,
          countedQty,
        };
      });

      const payload = {
        items,
        confirmAdjustment,
      };

      const response = await fetch('/api/stock-opname', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsCreateModalOpen(false);
        fetchOpnames();
        fetchProducts(); // Refresh products if adjustment was made
      } else {
        const data = await response.json();
        setError(data.error || 'Gagal menyimpan stock opname');
      }
    } catch (error) {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  const getDiffIcon = (diff: number) => {
    if (diff > 0) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (diff < 0) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    return <CheckCircle className="h-4 w-4 text-gray-400" />;
  };

  const getDiffBadgeVariant = (diff: number) => {
    if (diff > 0) return 'default';
    if (diff < 0) return 'destructive';
    return 'secondary';
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.sku.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && opnames.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Stock Opname</h1>
            <p className="text-gray-600">Pencatatan dan penyesuaian stok fisik</p>
          </div>
          <Button onClick={handleCreateOpname}>
            <Plus className="mr-2 h-4 w-4" />
            Buat Opname Baru
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stock Opname History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ClipboardList className="mr-2 h-5 w-5" />
              Riwayat Stock Opname
            </CardTitle>
          </CardHeader>
          <CardContent>
            {opnames.length === 0 && !loading ? (
              <div className="text-center py-12">
                <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada stock opname</h3>
                <p className="mt-1 text-sm text-gray-500">Mulai dengan membuat stock opname baru</p>
              </div>
            ) : (
              <div className="space-y-4">
                {opnames.map((opname) => (
                  <div key={opname.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-medium">Stock Opname #{opname.id.slice(-6)}</h3>
                        <p className="text-sm text-gray-600">
                          {formatDate(opname.date)} oleh {opname.user.name}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {opname.items.length} produk
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {opname.items.map((item) => (
                        <div key={item.productId} className="border rounded p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-sm">{item.product.name}</h4>
                              <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>
                            </div>
                            {getDiffIcon(item.diff)}
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Sistem:</span>
                              <span>{item.systemQty}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Fisik:</span>
                              <span>{item.countedQty}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>Selisih:</span>
                              <Badge variant={getDiffBadgeVariant(item.diff)}>
                                {item.diff > 0 ? '+' : ''}{item.diff}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6 space-x-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Create Opname Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsCreateModalOpen(false);
            setSelectedProducts({});
            setConfirmAdjustment(false);
          }
        }}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Stock Opname Baru</DialogTitle>
              <DialogDescription>
                Pilih produk dan masukkan jumlah stok fisik yang dihitung
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="search">Cari Produk</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Cari berdasarkan nama atau SKU..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredProducts.map((product) => {
                  const isSelected = product.id in selectedProducts;
                  const countedQty = selectedProducts[product.id] || 0;
                  const diff = countedQty - product.stock;

                  return (
                    <div key={product.id} className="border rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id={product.id}
                          checked={isSelected}
                          onCheckedChange={(checked) => handleProductSelect(product.id, checked as boolean)}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <Label htmlFor={product.id} className="font-medium cursor-pointer">
                                {product.name}
                              </Label>
                              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                              <p className="text-sm text-gray-600">Stok Sistem: {product.stock}</p>
                            </div>
                            {isSelected && (
                              <Badge variant={diff === 0 ? 'secondary' : diff > 0 ? 'default' : 'destructive'}>
                                {diff > 0 ? '+' : ''}{diff}
                              </Badge>
                            )}
                          </div>
                          
                          {isSelected && (
                            <div className="mt-3">
                              <Label htmlFor={`counted-${product.id}`}>Stok Fisik</Label>
                              <Input
                                id={`counted-${product.id}`}
                                type="number"
                                min="0"
                                value={countedQty}
                                onChange={(e) => handleCountedQtyChange(product.id, e.target.value)}
                                placeholder="Masukkan jumlah stok fisik"
                                className="w-32"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {Object.keys(selectedProducts).length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="confirmAdjustment"
                      checked={confirmAdjustment}
                      onCheckedChange={(checked) => setConfirmAdjustment(checked as boolean)}
                    />
                    <Label htmlFor="confirmAdjustment">
                      Konfirmasi penyesuaian stok secara otomatis
                    </Label>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={handleSubmitOpname}
                      disabled={submitting || Object.keys(selectedProducts).length === 0}
                    >
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Simpan Stock Opname
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}