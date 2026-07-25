import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tagihan = await prisma.tagihan.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            kamar: true,
          },
        },
        buktiTransfer: true,
      },
    });

    if (!tagihan) {
      return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 });
    }

    // Otorisasi: Pemilik atau Penyewa pemilik tagihan
    if (user.role !== 'OWNER' && tagihan.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const profil = await prisma.profilKos.findFirst() || {
      namaKos: 'Kos Tri J',
      nomorHp: '081234567890',
      alamat: 'Jl. Mawar No. 12, Kebayoran Baru',
      kota: 'Jakarta Selatan',
      kodePos: '12345',
      logoUrl: '/images/default-logo.png',
    };

    const nomorInvoice = (tagihan as any).nomorInvoice || `INV/${new Date().getFullYear()}/0${tagihan.id.substring(0, 4).toUpperCase()}`;
    const tanggalCetak = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const tanggalBayar = tagihan.updatedAt.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const formatRupiah = (num: number) =>
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${nomorInvoice}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      margin: 0;
      padding: 20px;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .logo {
      width: 60px;
      height: 60px;
      background: #2563eb;
      color: #ffffff;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 22px;
    }
    .brand-details h1 {
      margin: 0;
      font-size: 24px;
      color: #0f172a;
    }
    .brand-details p {
      margin: 3px 0 0 0;
      font-size: 12px;
      color: #64748b;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h2 {
      margin: 0;
      font-size: 28px;
      color: #2563eb;
      letter-spacing: 1px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      margin-top: 6px;
      text-transform: uppercase;
    }
    .badge-lunas { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
      background: #f8fafc;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #f1f5f9;
    }
    .info-box h4 {
      margin: 0 0 8px 0;
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-box p {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #1e293b;
      color: #ffffff;
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    td {
      padding: 14px 16px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }

    .total-container {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    .total-box {
      width: 300px;
      background: #eff6ff;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #bfdbfe;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .total-row.grand {
      border-top: 2px solid #2563eb;
      padding-top: 10px;
      font-size: 18px;
      font-weight: 800;
      color: #1e40af;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px dashed #cbd5e1;
    }
    .signature {
      text-align: center;
      width: 200px;
    }
    .signature-line {
      margin-top: 60px;
      border-top: 1px solid #0f172a;
      font-weight: 700;
      font-size: 13px;
      padding-top: 4px;
    }

    .btn-print {
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: #2563eb;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(37,99,235,0.4);
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; background: #fff; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-b: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
    .logo-container { display: flex; align-items: center; gap: 12px; }
    .logo-badge { width: 48px; h-48px; background: #2563eb; color: #fff; font-weight: 900; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .invoice-title { text-align: right; }
    .invoice-title h2 { margin: 0; font-size: 24px; color: #2563eb; text-transform: uppercase; font-weight: 900; }
    .invoice-title p { margin: 4px 0 0 0; font-size: 13px; font-weight: bold; color: #64748b; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-top: 6px; }
    .status-lunas { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .status-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .info-box h4 { margin: 0 0 8px 0; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-box p { margin: 2px 0; font-size: 13px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #0f172a; color: #fff; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; font-weight: 800; }
    td { padding: 14px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; }
    .summary-table { width: 300px; margin-left: auto; margin-bottom: 40px; }
    .summary-table td { padding: 8px 0; border-bottom: none; }
    .total-row { border-top: 2px solid #2563eb; font-size: 16px; font-weight: 900; color: #2563eb; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; pt-8 border-t border-slate-200; font-size: 11px; color: #94a3b8; }
    .signature-box { text-align: center; width: 180px; }
    .signature-space { height: 60px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer;">
      🖨️ Cetak / Simpan PDF
    </button>
  </div>

  <div class="header">
    <div class="logo-container">
      <div class="logo-badge">KTJ</div>
      <div>
        <h3 style="margin: 0; font-size: 16px; font-weight: 800;">${profil.namaKos}</h3>
        <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">${profil.alamat}, ${profil.kota}</p>
        <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">No. HP: ${profil.nomorHp}</p>
      </div>
    </div>
    <div class="invoice-title">
      <h2>INVOICE</h2>
      <p>${nomorInvoice}</p>
      <span class="status-badge ${tagihan.status === 'LUNAS' ? 'status-lunas' : 'status-pending'}">
        ${tagihan.status === 'LUNAS' ? 'LUNAS' : 'MENUNGGU VERIFIKASI'}
      </span>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h4>Diterbitkan Untuk:</h4>
      <p>${tagihan.user?.nama || 'Penyewa'}</p>
      <p style="font-size: 12px; color: #64748b; font-weight: normal;">Kamar: ${tagihan.user?.kamar?.nomorKamar || '-'}</p>
      <p style="font-size: 12px; color: #64748b; font-weight: normal;">Telp: ${tagihan.user?.nomorHp || '-'}</p>
    </div>
    <div class="info-box">
      <h4>Detail Pembayaran:</h4>
      <p style="font-size: 12px; color: #64748b;">Periode: <strong>${tagihan.bulanTagihan}</strong></p>
      <p style="font-size: 12px; color: #64748b;">Metode: <strong>${(tagihan as any).metodePembayaran || 'Transfer Bank'}</strong></p>
      <p style="font-size: 12px; color: #64748b;">Tanggal Bayar: <strong>${tanggalBayar}</strong></p>
    </div>
  </div>

    <table>
      <thead>
        <tr>
          <th>Deskripsi Tagihan</th>
          <th>Periode</th>
          <th style="text-align: right;">Nominal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Sewa Kamar ${tagihan.user?.kamar?.nomorKamar || ''}</strong><br>
            <span style="font-size: 12px; color: #64748b;">Pembayaran bulanan hunian kos</span>
          </td>
          <td>${tagihan.bulanTagihan}</td>
          <td style="text-align: right; font-weight: 700;">${formatRupiah(tagihan.nominal)}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-container">
      <div class="total-box">
        <div class="total-row">
          <span>Subtotal</span>
          <span>${formatRupiah(tagihan.nominal)}</span>
        </div>
        <div class="total-row">
          <span>Biaya Admin</span>
          <span>Rp 0</span>
        </div>
        <div class="total-row grand">
          <span>Total Bayar</span>
          <span>${formatRupiah(tagihan.nominal)}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">Dokumen ini diterbitkan secara sah oleh Sistem Kos Tri J.</p>
        <p style="font-size: 11px; color: #94a3b8; margin: 2px 0 0 0;">Tanggal Cetak: ${tanggalCetak}</p>
      </div>
      <div class="signature">
        <p style="font-size: 12px; color: #64748b; margin-bottom: 40px;">Pengelola Kos Tri J</p>
        <div class="signature-line">Tanda Tangan Digital</div>
      </div>
    </div>
  </div>

  <button class="btn-print" onclick="window.print()">🖨️ Cetak / Simpan ke PDF</button>

  <script>
    // Auto print prompt for convenience if query contains print=1
    if (window.location.search.includes('print=1')) {
      window.onload = () => window.print();
    }
  </script>
</body>
</html>
    `;

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Invoice download route error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
