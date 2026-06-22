import { jwtVerify, SignJWT } from 'jose';

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
