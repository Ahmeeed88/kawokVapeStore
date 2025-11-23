import { PrismaClient } from '@prisma/client';
import { hashPassword } from './src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create admin user
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kawokvape.com' },
    update: {},
    create: {
      email: 'admin@kawokvape.com',
      name: 'Administrator',
      password: adminPassword,
      isAdmin: true,
    },
  });

  console.log('Created admin user:', admin);

  // Create sample products
  const products = [
    {
      sku: 'KV001',
      name: 'Vape Pod Starter Kit',
      description: 'Pod vape starter kit untuk pemula',
      category: 'Starter Kit',
      buyPrice: 150000,
      sellingPrice: 200000,
      stock: 25,
    },
    {
      sku: 'KV002',
      name: 'Liquid Tobacco 3mg',
      description: 'Liquid rasa tobacco dengan nikotin 3mg',
      category: 'Liquid',
      buyPrice: 75000,
      sellingPrice: 100000,
      stock: 50,
    },
    {
      sku: 'KV003',
      name: 'Coil Replacement Pack',
      description: 'Pack coil replacement (5 pcs)',
      category: 'Aksesoris',
      buyPrice: 50000,
      sellingPrice: 75000,
      stock: 8,
    },
    {
      sku: 'KV004',
      name: 'Vape Mod Box',
      description: 'Mod box vape 200W',
      category: 'Mod',
      buyPrice: 300000,
      sellingPrice: 450000,
      stock: 5,
    },
    {
      sku: 'KV005',
      name: 'Battery 18650',
      description: 'Battery 18650 3000mAh',
      category: 'Battery',
      buyPrice: 75000,
      sellingPrice: 100000,
      stock: 3,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: {
        ...product,
        dateIn: new Date(),
      },
    });
  }

  console.log('Created sample products');

  // Create settings
  const settings = [
    { key: 'store_name', value: 'KawokVapeStore' },
    { key: 'store_address', value: 'Jl. Contoh No. 123, Jakarta' },
    { key: 'store_phone', value: '+62 812-3456-7890' },
    { key: 'currency', value: 'IDR' },
    { key: 'low_stock_threshold', value: '10' },
  ];

  for (const setting of settings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log('Created settings');

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });