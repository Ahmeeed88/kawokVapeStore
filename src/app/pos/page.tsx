'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2,
  CreditCard,
  DollarSign,
  Loader2,
  Package,
  Receipt
} from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  sellingPrice: number;
  stock: number;
}

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  qty: number;
  subtotal: number;
  maxStock: number;
}

interface Sale {
  id: string;
  invoiceNo: string;
  totalAmount: number;
  paymentMethod: 'CASH' | 'TRANSFER';
  paidAmount?: number;
  changeAmount?: number;
  createdAt: string;
  items: CartItem[];
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [paidAmount, setPaidAmount] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      } else {
        setError('Gagal memuat data produk');
      }
    } catch (error) {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.sku.toLowerCase().includes(search.toLowerCase()) ||
    product.category?.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    if (product.stock === 0) {
      setError('Stok tidak tersedia');
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);
      
      if (existingItem) {
        if (existingItem.qty >= product.stock) {
          setError('Stok tidak mencukupi');
          return prevCart;
        }
        return prevCart.map(item =>
          item.productId === product.id
            ? {
                ...item,
                qty: item.qty + 1,
                subtotal: (item.qty + 1) * item.unitPrice
              }
            : item
        );
      }
      
      return [
        ...prevCart,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice: product.sellingPrice,
          qty: 1,
          subtotal: product.sellingPrice,
          maxStock: product.stock
        }
      ];
    });
  };

  const updateCartItemQty = (productId: string, newQty: number) => {
    if (newQty < 1) return;
    
    const item = cart.find(item => item.productId === productId);
    if (item && newQty > item.maxStock) {
      setError('Stok tidak mencukupi');
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.productId === productId
          ? {
              ...item,
              qty: newQty,
              subtotal: newQty * item.unitPrice
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const getChangeAmount = () => {
    if (paymentMethod === 'CASH' && paidAmount) {
      return parseFloat(paidAmount) - getTotalAmount();
    }
    return 0;
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setError('Keranjang belanja kosong');
      return;
    }

    if (paymentMethod === 'CASH' && (!paidAmount || parseFloat(paidAmount) < getTotalAmount())) {
      setError('Jumlah pembayaran tidak mencukupi');
      return;
    }

    setIsCheckoutModalOpen(true);
  };

  const confirmCheckout = async () => {
    try {
      setSubmitting(true);
      setError('');

      const payload = {
        items: cart.map(item => ({
          productId: item.productId,
          qty: item.qty,
          unitPrice: item.unitPrice,
        })),
        paymentMethod,
        paidAmount: paymentMethod === 'CASH' ? parseFloat(paidAmount) : null,
      };

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const sale: Sale = await response.json();
        setLastSale(sale);
        setIsCheckoutModalOpen(false);
        setIsSuccessModalOpen(true);
        clearCart();
        setPaymentMethod('CASH');
        setPaidAmount('');
        fetchProducts(); // Refresh products to update stock
      } else {
        const data = await response.json();
        setError(data.error || 'Gagal memproses transaksi');
      }
    } catch (error) {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">POS / Kasir</h1>
            <p className="text-gray-600">Sistem Point of Sale</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Products Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  Produk
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cari produk berdasarkan nama atau SKU..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => addToCart(product)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">{product.name}</h3>
                            <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                            {product.category && (
                              <Badge variant="outline" className="mt-1">
                                {product.category}
                              </Badge>
                            )}
                          </div>
                          <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-lg">
                            {formatCurrency(product.sellingPrice)}
                          </span>
                          <Badge variant={product.stock === 0 ? 'destructive' : product.stock < 10 ? 'secondary' : 'default'}>
                            Stok: {product.stock}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cart Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Keranjang
                  </div>
                  {cart.length > 0 && (
                    <Button variant="outline" size="sm" onClick={clearCart}>
                      Kosongkan
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Keranjang kosong</h3>
                    <p className="mt-1 text-sm text-gray-500">Tambah produk untuk memulai</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {cart.map((item) => (
                        <div key={item.productId} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-sm">{item.name}</h4>
                              <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.productId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateCartItemQty(item.productId, item.qty - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">{item.qty}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateCartItemQty(item.productId, item.qty + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(item.subtotal)}</p>
                              <p className="text-xs text-gray-500">
                                {formatCurrency(item.unitPrice)} x {item.qty}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Total:</span>
                        <span className="font-bold text-lg">{formatCurrency(getTotalAmount())}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={handleCheckout}
                      disabled={cart.length === 0}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Checkout
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Checkout Modal */}
        <Dialog open={isCheckoutModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsCheckoutModalOpen(false);
            setError('');
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
              <DialogDescription>
                Periksa kembali detail pembayaran sebelum konfirmasi
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Metode Pembayaran</Label>
                <Select 
                  value={paymentMethod} 
                  onValueChange={(value: 'CASH' | 'TRANSFER') => setPaymentMethod(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">
                      <div className="flex items-center">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Cash
                      </div>
                    </SelectItem>
                    <SelectItem value="TRANSFER">
                      <div className="flex items-center">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Transfer
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'CASH' && (
                <div className="space-y-2">
                  <Label htmlFor="paidAmount">Jumlah Pembayaran</Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0"
                  />
                  {paidAmount && parseFloat(paidAmount) >= getTotalAmount() && (
                    <p className="text-sm text-green-600">
                      Kembalian: {formatCurrency(getChangeAmount())}
                    </p>
                  )}
                </div>
              )}

              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-2">Ringkasan Pesanan</h4>
                <div className="space-y-1 text-sm">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex justify-between">
                      <span>{item.name} x {item.qty}</span>
                      <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(getTotalAmount())}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsCheckoutModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  onClick={confirmCheckout}
                  disabled={submitting || (paymentMethod === 'CASH' && (!paidAmount || parseFloat(paidAmount) < getTotalAmount()))}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Konfirmasi Pembayaran
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Success Modal */}
        <Dialog open={isSuccessModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsSuccessModalOpen(false);
            setLastSale(null);
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Receipt className="mr-2 h-5 w-5 text-green-600" />
                Pembayaran Berhasil
              </DialogTitle>
              <DialogDescription>
                Transaksi telah berhasil diproses
              </DialogDescription>
            </DialogHeader>
            
            {lastSale && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-green-50">
                  <div className="text-center mb-4">
                    <h3 className="font-bold text-lg">{lastSale.invoiceNo}</h3>
                    <p className="text-sm text-gray-600">{formatDate(lastSale.createdAt)}</p>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Metode Pembayaran:</span>
                      <Badge variant={lastSale.paymentMethod === 'CASH' ? 'default' : 'secondary'}>
                        {lastSale.paymentMethod}
                      </Badge>
                    </div>
                    
                    {lastSale.paidAmount && (
                      <>
                        <div className="flex justify-between">
                          <span>Jumlah Dibayar:</span>
                          <span>{formatCurrency(lastSale.paidAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Kembalian:</span>
                          <span>{formatCurrency(lastSale.changeAmount || 0)}</span>
                        </div>
                      </>
                    )}
                    
                    <Separator />
                    
                    <div className="space-y-1">
                      {lastSale.items.map((item) => (
                        <div key={item.productId} className="flex justify-between">
                          <span>{item.name} x {item.qty}</span>
                          <span>{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(lastSale.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => setIsSuccessModalOpen(false)}
                >
                  Selesai
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}