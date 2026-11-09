import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import AnnouncementForm from './AnnouncementForm';

describe('AnnouncementForm', () => {
  it('does not render a category field', () => {
    const html = renderToStaticMarkup(
      <AnnouncementForm siteSlug="site-a" initial={null} />,
    );

    expect(html).not.toContain('分類');
  });
});
