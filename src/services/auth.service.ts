import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

const hashPrefix = 'sha256:';
function digest(password: string) {
  return createHash('sha256').update(password, 'utf8').digest('base64');
}

async function hashPassword(password: string) {
  return hashPrefix + await bcrypt.hash(digest(password), 10);
}

export const authService = {
  async register(email: string, password: string) {
    const passwordHash = await hashPassword(password);
    return prisma.user.create({ data: { email, passwordHash } });
  },
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return null;
    }
    const modern = user.passwordHash.startsWith(hashPrefix);
    if (!modern && Buffer.byteLength(password, 'utf8') > 72) {
      return null;
    }
    let matches: boolean;
    if (modern) {
      matches = await bcrypt.compare(digest(password), user.passwordHash.slice(hashPrefix.length));
    } else {
      matches = await bcrypt.compare(password, user.passwordHash);
    }
    if (!matches) {
      return null;
    }
    if (!modern) {
      await prisma.user.updateMany({
        where: { id: user.id, passwordHash: user.passwordHash },
        data: { passwordHash: await hashPassword(password) },
      });
    }
    return user;
  },
  token(userId: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }
    return jwt.sign({}, secret, { subject: userId, expiresIn: '1h', algorithm: 'HS256' });
  },
};
