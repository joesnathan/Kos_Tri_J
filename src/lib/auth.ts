import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import prisma from './prisma';
import { verifyToken, signToken } from './jwt';

export { verifyToken, signToken };

/**
 * Hashes a plaintext password securely.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compares a plaintext password against a stored secure hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Returns the currently authenticated user's profile from the session cookie.
 */
export async function getUserFromSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('__Secure-session')?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload || !payload.id) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        nomorHp: true,
        kamarId: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Error fetching user from session:', error);
    return null;
  }
}
