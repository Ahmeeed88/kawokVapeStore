# 🛒 KawokVapeStore - Simple POS & Inventory System

Aplikasi web Point of Sale (POS) dan Inventory sederhana untuk toko vape dengan nama **KawokVapeStore**. Aplikasi ini dirancang khusus untuk admin mengelola produk, stok, harga, mencatat tanggal barang masuk/keluar, stock opname, dan melihat laporan yang bisa difilter berdasarkan tanggal.

## ✨ Fitur Utama

### 🔐 Autentikasi
- Login admin (email + password)
- Single role: admin
- Session-based authentication dengan JWT

### 📦 Manajemen Produk
- CRUD produk lengkap (sku, nama, deskripsi, kategori, harga beli/jual, stok, foto)
- SKU unik untuk setiap produk
- Pencarian dan filter produk
- Badge indikator stok rendah/habis

### 📊 Manajemen Stok & Mutasi
- Catat stok masuk (manual) dengan qty, tanggal, dan keterangan
- Catat stok keluar (manual) untuk koreksi atau pengeluaran lainnya
- Audit trail lengkap di tabel `stock_movements`
- Stock opname dengan perhitungan selisih dan konfirmasi penyesuaian

### 💳 POS / Kasir
- Halaman kasir sederhana dengan pencarian produk (SKU/nama)
- Shopping cart dengan management quantity
- Pembayaran: Cash dan Transfer (manual)
- Invoice/struk dengan nomor unik format `KAWOK-YYYYMMDD-XXXX`
- Update stok otomatis setelah transaksi

### 📈 Laporan Dinamis
- Filter berdasarkan date range (from/to)
- Report types:
  - Sales (list + total)
  - Stock level (current stock per product)
  - Top-selling (rank by quantity)
  - Stock movements (mutasi antara tanggal)
- Export ke CSV dan JSON

### ⚙️ Settings
- Company/store profile (nama, alamat, kontak)
- Currency (default: IDR)
- Low stock threshold configuration
- Backup database instructions

## 🛠️ Teknologi yang Digunakan

### Backend
- **Next.js 15** dengan App Router
- **TypeScript 5** untuk type safety
- **Prisma ORM** dengan SQLite
- **JWT** untuk autentikasi
- **bcryptjs** untuk password hashing

### Frontend
- **React 19** dengan Server Components
- **Tailwind CSS 4** untuk styling
- **shadcn/ui** component library
- **Lucide React** untuk icons
- **React Hook Form** dengan Zod validation

### Database
- **SQLite** untuk single-host deployment
- Schema lengkap dengan relasi yang terdefinisi dengan baik

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm atau yarn

### Installation

1. **Clone dan install dependencies**
```bash
git clone <repository-url>
cd kawok-vape-store
npm install
```

2. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env sesuai kebutuhan
```

3. **Setup database**
```bash
# Generate Prisma client
npm run db:generate

# Push schema ke database
npm run db:push

# Seed data (admin user + sample products)
npm run db:seed
```

4. **Start development server**
```bash
npm run dev
```

5. **Buka aplikasi**
- URL: http://localhost:3000
- Login dengan:
  - Email: `admin@kawokvape.com`
  - Password: `admin123`

## 🐳 Docker Deployment

### Menggunakan Docker Compose

1. **Build dan start containers**
```bash
docker-compose up --build
```

2. **Akses aplikasi**
- URL: http://localhost:3000

3. **Stop containers**
```bash
docker-compose down
```

### Manual Deployment (VPS/Hosting)

1. **Persiapkan environment**
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone <repository-url>
cd kawok-vape-store

# Install dependencies
npm install
```

2. **Setup production environment**
```bash
# Copy environment file
cp .env.example .env

# Edit .env untuk production
NODE_ENV=production
JWT_SECRET=your-very-secure-jwt-secret
DATABASE_URL="file:./dev.db"
```

3. **Build dan setup database**
```bash
# Generate Prisma client
npm run db:generate

# Setup database
npm run db:push

# Seed data (optional)
npm run db:seed
```

4. **Start production server**
```bash
npm run build
npm start
```

5. **Setup Reverse Proxy (nginx)**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📁 Database Schema

### Core Tables
- **users** - Data user/admin
- **products** - Master data produk
- **stock_movements** - Audit trail semua pergerakan stok
- **sales** - Header transaksi penjualan
- **sale_items** - Detail item penjualan
- **stock_opnames** - Header stock opname
- **stock_opname_items** - Detail item stock opname
- **settings** - Konfigurasi sistem

### Business Rules
- Semua stok dalam satuan PCS (tidak ada konversi)
- SKU harus unik
- Penjualan otomatis mengurangi stok
- Stock opname wajib konfirmasi untuk update stok
- Nomor invoice format: `KAWOK-YYYYMMDD-XXXX`

## 🔒 Security Features

- Password hashing dengan bcryptjs
- JWT token untuk session management
- HTTP-only cookies untuk token storage
- Server-side validation untuk semua input
- SQL injection prevention dengan Prisma ORM
- XSS protection dengan React built-in features

## 📦 Backup & Maintenance

### Manual Backup
```bash
# Stop aplikasi
sudo systemctl stop kawok-vape

# Backup database
cp prisma/dev.db backup/backup-$(date +%Y%m%d-%H%M%S).db

# Start aplikasi
sudo systemctl start kawok-vape
```

### Automated Backup (Cron)
```bash
# Edit crontab
crontab -e

# Add backup script (setiap hari jam 2 pagi)
0 2 * * * cd /path/to/kawok-vape-store && mkdir -p backup && cp prisma/dev.db backup/backup-$(date +\%Y\%m\%d-\%H\%M\%S).db && find backup/ -name "*.db" -mtime +7 -delete
```

## 🎯 Default Credentials

- **Email:** admin@kawokvape.com
- **Password:** admin123
- **Currency:** IDR
- **Low Stock Threshold:** 10 items

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - Login admin
- `POST /api/auth/logout` - Logout admin

### Products
- `GET /api/products` - List produk dengan pagination & filter
- `POST /api/products` - Tambah produk baru
- `GET /api/products/[id]` - Detail produk
- `PUT /api/products/[id]` - Update produk
- `DELETE /api/products/[id]` - Hapus produk

### Stock & POS
- `GET /api/stock-movements` - List mutasi stok
- `POST /api/stock-movements` - Catat mutasi stok
- `GET /api/sales` - List penjualan
- `POST /api/sales` - Proses transaksi POS

### Reports & Settings
- `GET /api/reports` - Generate laporan (sales, stock, top-selling, movements)
- `GET /api/settings` - Get settings
- `POST /api/settings` - Update settings

## 🐛 Troubleshooting

### Common Issues

1. **Database connection error**
```bash
# Check database file exists
ls -la prisma/dev.db

# Regenerate Prisma client
npm run db:generate
npm run db:push
```

2. **Port already in use**
```bash
# Kill process on port 3000
sudo lsof -ti:3000 | xargs kill -9
```

3. **Permission denied**
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod -R 755 .
```

## 📄 License

MIT License - feel free to use this project for commercial or personal use.

## 🤝 Contributing

1. Fork project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Email: support@kawokvape.com
- Documentation: Check this README file
- Issues: Create GitHub issue for bugs

---

Built with ❤️ for vape store owners. Simple, reliable, and easy to use.