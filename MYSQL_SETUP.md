# KawokVapeStore - MySQL Setup Guide

## 🗄️ Setup MySQL untuk HeidiSQL

### 1. Install MySQL
**Windows:**
- Download MySQL Community Server: https://dev.mysql.com/downloads/mysql/
- Atau install XAMPP: https://www.apachefriends.org/download.html

### 2. Buat Database via HeidiSQL
1. Buka HeidiSQL
2. Connect ke MySQL server:
   - Host: localhost atau 127.0.0.1
   - User: root
   - Password: (password MySQL Anda)
   - Port: 3306
3. Klik kanan → "Create new database"
4. Beri nama: `kawok_vape_store`
5. Klik "OK"

### 3. Update .env file
```env
# Database URL format untuk MySQL
DATABASE_URL="mysql://root:your_password@localhost:3306/kawok_vape_store"
```

**Contoh nyata:**
```env
DATABASE_URL="mysql://root:password123@localhost:3306/kawok_vape_store"
```

### 4. Install MySQL dependencies
```bash
npm install mysql2
```

### 5. Setup Database
```bash
# Generate Prisma client untuk MySQL
npx prisma generate

# Push schema ke MySQL
npx prisma db push

# Seed data
npm run db:seed
```

## 🔄 Switch antara SQLite dan MySQL

### Pilih SQLite (Default):
```env
DATABASE_URL="file:./dev.db"
```

### Pilih MySQL (HeidiSQL):
```env
DATABASE_URL="mysql://username:password@localhost:3306/kawok_vape_store"
```

## ⚠️ Catatan Penting
- **SQLite**: Simpler, no installation needed, file-based
- **MySQL**: More powerful, HeidiSQL friendly, but needs installation
- Keduanya supported, tinggal ganti DATABASE_URL di .env

## 🐳 Docker MySQL (Optional)
Jika mau pakai MySQL di Docker:
```yaml
# Tambah ke docker-compose.yml
mysql:
  image: mysql:8.0
  container_name: kawok-mysql
  environment:
    MYSQL_ROOT_PASSWORD: password123
    MYSQL_DATABASE: kawok_vape_store
  ports:
    - "3306:3306"
  volumes:
    - mysql_data:/var/lib/mysql

# Dan update app service untuk connect ke MySQL
app:
  environment:
    - DATABASE_URL=mysql://root:password123@mysql:3306/kawok_vape_store
  depends_on:
    - mysql
```