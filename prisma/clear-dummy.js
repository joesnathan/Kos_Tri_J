const { neonConfig } = require('@neondatabase/serverless');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { PrismaClient } = require('@prisma/client');
const ws = require('ws');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file manually
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

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL is not set in your .env file.');
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Memulai pembersihan data dummy dari database...');

  // Hapus bukti transfer, tagihan, dan user penyewa
  await prisma.buktiTransfer.deleteMany();
  await prisma.tagihan.deleteMany();
  
  // Hapus semua user kecuali owner@kos.com
  await prisma.user.deleteMany({
    where: {
      email: { not: 'owner@kos.com' }
    }
  });

  // Pastikan rekening bank pemilik BCA ada
  await prisma.rekeningPemilik.deleteMany();
  await prisma.rekeningPemilik.create({
    data: {
      namaBank: 'BCA',
      nomorRekening: '8000123456',
      atasNama: 'Budi Pemilik Kos',
    },
  });

  // Pastikan user owner@kos.com ada
  const hashedPassword = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { email: 'owner@kos.com' },
    update: { password: hashedPassword },
    create: {
      nama: 'Budi (Pemilik Kos)',
      email: 'owner@kos.com',
      password: hashedPassword,
      role: 'OWNER',
      nomorHp: '081234567890',
    }
  });

  // Buat ulang atau update 10 Kamar agar berstatus 'Kosong'
  console.log('Menyiapkan 10 Kamar kosong (Kamar 1 s/d Kamar 10)...');
  await prisma.kamar.deleteMany(); // Reset all rooms to make sure no old foreign keys/UUID issues exist
  
  for (let i = 1; i <= 10; i++) {
    const hargaBulanan = i % 2 === 0 ? 1800000 : 1500000;
    await prisma.kamar.create({
      data: {
        nomorKamar: `Kamar ${i}`,
        hargaBulanan,
        status: 'Kosong',
      },
    });
  }

  console.log('Database berhasil dibersihkan! Kamar 1 - 10 berstatus KOSONG.');
}

main()
  .catch((e) => {
    console.error('Error saat membersihkan database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
