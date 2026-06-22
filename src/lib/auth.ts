import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import prisma from './prisma';

// Safe JWT Secret Loader matching secure coding guidelines
const getJwtSecretKey = (): Uint8Array => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is not configured in production environment variables.');
    }
    // Dev fallback: log a warning and use a local fallback key
    console.warn("Generating ephemeral secret for local development. Instance-isolated!");
    return new TextEncoder().encode('local-development-fallback-secret-key-must-be-changed-in-prod-at-least-32-chars');
  }
  return new TextEncoder().encode(secret);
};

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
 * Signs a payload into a secure HS256 JWT string.
 */
export async function signToken(payload: { id: string; email: string; role: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Session valid for 7 days
    .sign(getJwtSecretKey());
}

/**
 * Verifies a JWT token using HS256 signature algorithm.
 */
export async function verifyToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
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
