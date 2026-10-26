import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

import Header from './Header';

describe('Header', () => {
  it('does not render the install app button', () => {
    const html = renderToStaticMarkup(
      <Header user={{ name: '測試使用者', role: 'admin' }} />,
    );

    expect(html).not.toContain('安裝到桌面');
  });
});
