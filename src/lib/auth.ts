import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'kawok-vape-secret-key';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    console.log('Verifying token:', token ? 'Token exists' : 'No token');
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log('Token decoded successfully:', decoded.email);
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function createUser(email: string, name: string, password: string, isAdmin = true) {
  const hashedPassword = await hashPassword(password);
  return db.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      isAdmin,
    },
  });
}

export async function authenticateUser(email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user || !await verifyPassword(password, user.password)) {
    return null;
  }

  return user;
}

export async function getUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      createdAt: true,
    },
  });
}