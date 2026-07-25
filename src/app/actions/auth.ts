'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { verifyPassword, hashPassword, signToken, getUserFromSession } from '@/lib/auth';
import { createLogAktivitas, createNotifikasi } from './owner';

export type ActionState = {
  error?: string;
  success?: boolean;
};

async function getClientMeta() {
  try {
    const headerList = await headers();
    const ipAddress = headerList.get('x-forwarded-for')?.split(',')[0] || headerList.get('x-real-ip') || '127.0.0.1';
    const userAgent = headerList.get('user-agent') || 'Browser';
    
    let device = 'Desktop';
    if (/mobile/i.test(userAgent)) device = 'Mobile Android/iPhone';
    else if (/tablet|ipad/i.test(userAgent)) device = 'Tablet';

    let browser = 'Browser';
    if (/chrome/i.test(userAgent)) browser = 'Chrome';
    else if (/firefox/i.test(userAgent)) browser = 'Firefox';
    else if (/safari/i.test(userAgent)) browser = 'Safari';
    else if (/edge/i.test(userAgent)) browser = 'Edge';

    return { ipAddress, device, browser };
  } catch (err) {
    return { ipAddress: '127.0.0.1', device: 'Desktop', browser: 'Browser' };
  }
}

/**
 * Server Action to authenticate a user.
 */
export async function loginAction(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const meta = await getClientMeta();

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi.' };
  }

  let redirectPath = '';

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await createLogAktivitas('Gagal Login', `Percobaan login gagal untuk email ${email}.`, {
        namaUser: email,
        role: 'GUEST',
        ...meta,
      });
      return { error: 'Email atau password salah.' };
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      await createLogAktivitas('Gagal Login', `Percobaan login gagal dengan password salah untuk ${user.nama}.`, {
        userId: user.id,
        namaUser: user.nama,
        role: user.role,
        ...meta,
      });
      return { error: 'Email atau password salah.' };
    }

    // Sign the secure JWT token
    const token = await signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Write token to HttpOnly secure cookie
    const cookieStore = await cookies();
    cookieStore.set('__Secure-session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });

    await createLogAktivitas('Login', `Pengguna ${user.nama} (${user.role}) berhasil login.`, {
      userId: user.id,
      namaUser: user.nama,
      role: user.role,
      ...meta,
    });

    redirectPath = user.role === 'OWNER' ? '/dashboard/owner' : '/dashboard/tenant';
  } catch (error: any) {
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('Login action database error:', error);
    return { error: 'Terjadi kesalahan sistem.' };
  }

  if (redirectPath) {
    redirect(redirectPath);
  }

  return { success: true };
}

/**
 * Server Action to register a new user.
 */
export async function registerAction(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  const nama = formData.get('nama') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const roleInput = formData.get('role') as string;
  const nomorHp = formData.get('nomorHp') as string;
  const kamarId = formData.get('kamarId') as string | null;
  const meta = await getClientMeta();

  if (!nama || !email || !password || !roleInput || !nomorHp) {
    return { error: 'Semua field wajib diisi.' };
  }

  if (password.length < 8) {
    return { error: 'Password minimal harus 8 karakter.' };
  }

  if (roleInput !== 'OWNER' && roleInput !== 'TENANT') {
    return { error: 'Role tidak valid.' };
  }

  const role = roleInput as 'OWNER' | 'TENANT';

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: 'Email sudah terdaftar.' };
    }

    const hashedPassword = await hashPassword(password);
    const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          nama,
          email,
          password: hashedPassword,
          role,
          nomorHp,
          kamarId: (kamarId && kamarId !== 'none') ? kamarId : null,
        },
      });

      if (role === 'TENANT' && kamarId && kamarId !== 'none') {
        await tx.kamar.update({
          where: { id: kamarId },
          data: { status: 'Terisi' },
        });

        const targetKamar = await tx.kamar.findUnique({ where: { id: kamarId } });
        if (targetKamar) {
          await tx.tagihan.create({
            data: {
              userId: user.id,
              nominal: targetKamar.hargaBulanan,
              bulanTagihan: currentMonthStr,
              status: 'BELUM_BAYAR',
            },
          });
        }
      }
      return { id: user.id, nama: user.nama, role: user.role, kamarId: user.kamarId };
    });

    if (result.role === 'TENANT') {
      let roomInfo = '';
      if (result.kamarId) {
        const kamar = await prisma.kamar.findUnique({ where: { id: result.kamarId } });
        roomInfo = kamar ? ` (Kamar ${kamar.nomorKamar})` : '';
      }
      await createLogAktivitas('Penyewa Baru', `Penyewa baru ${result.nama}${roomInfo} mendaftar.`, {
        userId: result.id,
        namaUser: result.nama,
        role: result.role,
        ...meta,
      });
      await createNotifikasi(null, 'Penyewa Baru Terdaftar', `${result.nama} mendaftar sebagai penyewa baru${roomInfo}.`, '/dashboard/owner/penyewa');
    } else {
      await createLogAktivitas('Pemilik Baru', `Akun pemilik kos ${result.nama} didaftarkan.`, {
        userId: result.id,
        namaUser: result.nama,
        role: result.role,
        ...meta,
      });
    }

  } catch (error: any) {
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('Registration action database error:', error);
    return { error: 'Terjadi kesalahan saat menyimpan user baru.' };
  }

  redirect('/login');
  return { success: true };
}

/**
 * Server Action to clear user session and log out.
 */
export async function logoutAction() {
  try {
    const user = await getUserFromSession();
    const meta = await getClientMeta();

    if (user) {
      await createLogAktivitas('Logout', `Pengguna ${user.nama} telah logout.`, {
        userId: user.id,
        namaUser: user.nama,
        role: user.role,
        ...meta,
      });
    }

    const cookieStore = await cookies();
    cookieStore.set('__Secure-session', '', { maxAge: 0, path: '/' });
  } catch (error) {
    console.error('Logout action error:', error);
  }
  redirect('/login');
}
