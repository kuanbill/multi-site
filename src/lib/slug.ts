import { randomBytes } from 'node:crypto';

export function generateRandomSlug(): string {
  return `announcement-${randomBytes(6).toString('hex')}`;
}
