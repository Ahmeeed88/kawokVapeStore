'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Building,
  Phone,
  Mail,
  Globe,
  Hash,
  Loader2,
  Save
} from 'lucide-react';

interface SettingsData {
  store_name: string;
  store_address: string;
  store_phone: string;
  store_email: string;
  currency: string;
  low_stock_threshold: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    store_name: '',
    store_address: '',
    store_phone: '',
    store_email: '',
    currency: 'IDR',
    low_stock_threshold: '10',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          store_name: data.store_name || 'KawokVapeStore',
          store_address: data.store_address || '',
          store_phone: data.store_phone || '',
          store_email: data.store_email || '',
          currency: data.currency || 'IDR',
          low_stock_threshold: data.low_stock_threshold || '10',
        });
      } else {
        setError('Gagal memuat pengaturan');
      }
    } catch (error) {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        setSuccess('Pengaturan berhasil disimpan');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Gagal menyimpan pengaturan');
      }
    } catch (error) {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (key: keyof SettingsData, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Pengaturan</h1>
            <p className="text-gray-600">Kelola profil dan konfigurasi toko</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Store Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="mr-2 h-5 w-5" />
                Informasi Toko
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="store_name">Nama Toko</Label>
                <Input
                  id="store_name"
                  value={settings.store_name}
                  onChange={(e) => handleInputChange('store_name', e.target.value)}
                  placeholder="Masukkan nama toko"
                />
              </div>

              <div>
                <Label htmlFor="store_address">Alamat</Label>
                <Textarea
                  id="store_address"
                  value={settings.store_address}
                  onChange={(e) => handleInputChange('store_address', e.target.value)}
                  placeholder="Masukkan alamat lengkap toko"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="store_phone">Telepon</Label>
                  <Input
                    id="store_phone"
                    value={settings.store_phone}
                    onChange={(e) => handleInputChange('store_phone', e.target.value)}
                    placeholder="+62 812-3456-7890"
                  />
                </div>

                <div>
                  <Label htmlFor="store_email">Email</Label>
                  <Input
                    id="store_email"
                    type="email"
                    value={settings.store_email}
                    onChange={(e) => handleInputChange('store_email', e.target.value)}
                    placeholder="info@tokovape.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Pengaturan Sistem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency">Mata Uang</Label>
                  <Input
                    id="currency"
                    value={settings.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    placeholder="IDR"
                  />
                </div>

                <div>
                  <Label htmlFor="low_stock_threshold">Batas Stok Rendah</Label>
                  <Input
                    id="low_stock_threshold"
                    type="number"
                    min="1"
                    value={settings.low_stock_threshold}
                    onChange={(e) => handleInputChange('low_stock_threshold', e.target.value)}
                    placeholder="10"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Produk akan ditandai sebagai stok rendah jika jumlahnya kurang dari nilai ini
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Backup Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Backup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Catatan Backup Database:</strong>
                </AlertDescription>
              </Alert>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Cara Manual Backup Database SQLite:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Stop aplikasi terlebih dahulu</li>
                  <li>Copy file database: <code className="bg-gray-200 px-1 rounded">cp prisma/dev.db backup/backup-$(date +%Y%m%d-%H%M%S).db</code></li>
                  <li>Simpan file backup di lokasi yang aman</li>
                  <li>Restart aplikasi</li>
                </ol>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Contoh Cron Job untuk Backup Otomatis:</h4>
                <pre className="text-sm bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
{`# Backup setiap hari jam 2 pagi
0 2 * * * cd /path/to/your/project && mkdir -p backup && cp prisma/dev.db backup/backup-$(date +\\%Y\\%m\\%d-\\%H\\%M\\%S).db && find backup/ -name "*.db" -mtime +7 -delete`}
                </pre>
                <p className="text-sm text-gray-600 mt-2">
                  Cron job di atas akan backup database setiap hari jam 2 pagi dan menghapus backup yang lebih dari 7 hari.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={submitting}
              className="px-6"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Simpan Pengaturan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}