import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const cashierPassword = await bcrypt.hash('cashier123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@pharmacy.gh' },
    update: {},
    create: {
      email: 'admin@pharmacy.gh',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'cashier@pharmacy.gh' },
    update: {},
    create: {
      email: 'cashier@pharmacy.gh',
      password: cashierPassword,
      name: 'Kwame Mensah',
      role: 'CASHIER',
    },
  });

  const products = [
    { name: 'Paracetamol 500mg', sku: 'MED-001', category: 'Pain Relief', price: 5.0, quantity: 200, supplier: 'PharmaGh Ltd' },
    { name: 'Amoxicillin 250mg', sku: 'MED-002', category: 'Antibiotics', price: 12.5, quantity: 80, supplier: 'MedSupply GH' },
    { name: 'ORS Sachets', sku: 'MED-003', category: 'Rehydration', price: 2.0, quantity: 500, supplier: 'HealthPlus' },
    { name: 'Vitamin C 1000mg', sku: 'MED-004', category: 'Supplements', price: 15.0, quantity: 120, supplier: 'VitaCare' },
    { name: 'Cetirizine 10mg', sku: 'MED-005', category: 'Allergy', price: 8.0, quantity: 150, supplier: 'PharmaGh Ltd' },
    { name: 'Metformin 500mg', sku: 'MED-006', category: 'Diabetes', price: 10.0, quantity: 90, supplier: 'MedSupply GH' },
    { name: 'Hand Sanitizer 500ml', sku: 'SUP-001', category: 'Hygiene', price: 18.0, quantity: 60, supplier: 'CleanCare' },
    { name: 'Digital Thermometer', sku: 'DEV-001', category: 'Medical Devices', price: 45.0, quantity: 25, supplier: 'MedTech GH' },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: product,
      create: product,
    });
  }

  console.log('Seed completed: admin@pharmacy.gh / admin123, cashier@pharmacy.gh / cashier123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
