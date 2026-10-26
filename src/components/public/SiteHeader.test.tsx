import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import SiteHeader from './SiteHeader';

describe('SiteHeader', () => {
  it('renders the frontend site brand icon with the site name', () => {
    const html = renderToStaticMarkup(
      <SiteHeader siteSlug="zhonghe-renewal" siteName="中和都更案" features={[]} />,
    );

    expect(html).toContain('src="/site-icons/icon-512.png"');
    expect(html).toContain('alt=""');
    expect(html).toContain('>中和都更案</span>');
  });

  it('does not render the install app button', () => {
    const html = renderToStaticMarkup(
      <SiteHeader siteSlug="zhonghe-renewal" siteName="中和都更案" features={[]} />,
    );

    expect(html).not.toContain('安裝到桌面');
  });
});
