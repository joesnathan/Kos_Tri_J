'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { verifyPassword, hashPassword, signToken } from '@/lib/auth';

export type ActionState = {
  error?: string;
  success?: boolean;
};

/**
 * Server Action to authenticate a user.
 */
export async function loginAction(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi.' };
  }

  let redirectPath = '';

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: 'Email atau password salah.' };
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
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
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    redirectPath = user.role === 'OWNER' ? '/dashboard/owner' : '/dashboard/tenant';
  } catch (error: any) {
    // If it's a redirect, rethrow it so Next.js handles it properly
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

    await prisma.user.create({
      data: {
        nama,
        email,
        password: hashedPassword,
        role,
        nomorHp,
        kamarId: kamarId || null,
      },
    });

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
    const cookieStore = await cookies();
    cookieStore.delete('__Secure-session');
  } catch (error) {
    console.error('Logout action error:', error);
  }
  redirect('/login');
}
