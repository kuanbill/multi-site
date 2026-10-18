import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
}));

describe('Sidebar', () => {
  it('renders an accessible collapse control and hides labels in collapsed mode', () => {
    const html = renderToStaticMarkup(<Sidebar collapsed onToggle={() => undefined} />);

    expect(html).toContain('aria-label="展開側邊欄"');
    expect(html).toContain('title="儀表板"');
    expect(html).toContain('class="sr-only"');
    expect(html).toContain('w-20');
  });

  it('renders the expanded navigation state by default', () => {
    const html = renderToStaticMarkup(<Sidebar collapsed={false} onToggle={() => undefined} />);

    expect(html).toContain('aria-label="收合側邊欄"');
    expect(html).toContain('w-64');
    expect(html).toContain('>儀表板</span>');
  });

  it('renders a mobile drawer with a closeable backdrop', () => {
    const html = renderToStaticMarkup(
      <Sidebar
        collapsed={false}
        mobileOpen
        onMobileClose={() => undefined}
        onToggle={() => undefined}
      />,
    );

    expect(html).toContain('aria-label="關閉側邊欄"');
    expect(html).toContain('bg-black/40');
    expect(html).toContain('translate-x-0');
  });
});
