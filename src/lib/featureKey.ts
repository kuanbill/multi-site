import { createHash } from 'node:crypto';

export function generateFeatureKey(label: string) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (slug) return slug;

  const suffix = createHash('sha256').update(label).digest('hex').slice(0, 12);
  return `feature_${suffix}`;
}
