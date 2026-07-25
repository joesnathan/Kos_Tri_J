const { neonConfig } = require('@neondatabase/serverless');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { PrismaClient } = require('@prisma/client');
const ws = require('ws');
const bcrypt = require('bcryptjs');
// Load environment variables from .env file manually
const fs = require('fs');
const path = require('path');
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    });
  }
} catch (e) {
  console.error("Error parsing .env file:", e);
}

// Set up WebSocket constructor for Node.js environment
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL is not set in your .env file.');
  process.exit(1);
}

// Instantiate the Prisma Client with Neon Adapter config
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Memulai seeding database...');

  // Hapus data lama untuk mencegah duplikasi data unik
  await prisma.buktiTransfer.deleteMany();
  await prisma.tagihan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.kamar.deleteMany();
  await prisma.rekeningPemilik.deleteMany();

  // Hash password menggunakan salt rounds = 10 (sesuai standard login)
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Buat Rekening Pemilik
  await prisma.rekeningPemilik.create({
    data: {
      namaBank: 'BCA',
      nomorRekening: '8000123456',
      atasNama: 'Budi Pemilik Kos',
    },
  });
  console.log('- Rekening bank pemilik berhasil didaftarkan.');

  // 2. Buat User OWNER
  const owner = await prisma.user.create({
    data: {
      nama: 'Budi (Pemilik Kos)',
      email: 'owner@kos.com',
      password: hashedPassword,
      role: 'OWNER',
      nomorHp: '081234567890',
    },
  });
  console.log('- Akun Owner berhasil dibuat.');

  // 3. Buat 10 Kamar dan 10 Tenant
  console.log('Membuat 10 Kamar dan 10 Tenant...');
  for (let i = 1; i <= 10; i++) {
    // Tentukan status kamar (contoh: kamar 3 sedang diperbaiki, kamar 7 kosong, lainnya terisi)
    let status = 'Terisi';
    if (i === 3) status = 'Perbaikan';
    if (i === 7) status = 'Kosong';

    const hargaBulanan = i % 2 === 0 ? 1800000 : 1500000;

    const kamar = await prisma.kamar.create({
      data: {
        nomorKamar: `Kamar ${i}`,
        hargaBulanan,
        status,
      },
    });

    // Jika kamar terisi, buat tenant untuk kamar tersebut
    if (status === 'Terisi') {
      const tenant = await prisma.user.create({
        data: {
          nama: `Tenant Kamar ${i}`,
          email: `tenant${i}@kos.com`,
          password: hashedPassword,
          role: 'TENANT',
          nomorHp: `0898765432${i.toString().padStart(2, '0')}`,
          kamarId: kamar.id,
        },
      });

      // Buat tagihan aktif bulan Juni 2026 untuk tenant
      await prisma.tagihan.create({
        data: {
          userId: tenant.id,
          nominal: hargaBulanan,
          bulanTagihan: '2026-06',
          status: 'BELUM_BAYAR',
        },
      });
    }
  }

  console.log('- Data 10 Kamar, Tenant, dan Tagihannya berhasil dibuat.');
  console.log('\nSeeding selesai dengan sukses! Silakan gunakan kredensial berikut untuk login:');
  console.log('========================================================================');
  console.log('🔑 AKUN OWNER  -> Email: owner@kos.com  | Password: password123');
  console.log('🔑 AKUN TENANT -> Email: tenant1@kos.com | Password: password123 (s/d tenant10)');
  console.log('========================================================================');
}

main()
  .catch((e) => {
    console.error('Error saat melakukan seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
