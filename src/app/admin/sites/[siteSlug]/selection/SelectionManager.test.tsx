import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SelectionManager from './SelectionManager';

const selection = {
  id: 5,
  title: '第一期選配作業',
  status: 'published',
  description: '第一期說明',
  attachments: [
    { id: 1, media: { id: 10, type: 'pdf', filename: 'guide.pdf', url: '/uploads/guide.pdf' } },
    { id: 2, media: { id: 11, type: 'image', filename: 'plan.png', url: '/uploads/plan.png' } },
  ],
};

describe('SelectionManager', () => {
  it('renders an empty state and create action for writers', () => {
    const html = renderToStaticMarkup(<SelectionManager siteSlug="alpha" items={[]} canWrite canDelete={false} />);

    expect(html).toContain('尚無選配作業項目');
    expect(html).toContain('新增選配作業');
    expect(html).toContain('/admin/sites/alpha/selection/new');
  });

  it('lists each entry with edit/delete controls according to permissions', () => {
    const html = renderToStaticMarkup(<SelectionManager siteSlug="alpha" items={[selection]} canWrite canDelete />);

    expect(html).toContain('第一期選配作業');
    expect(html).toContain('已發布');
    expect(html).toContain('2 個附件');
    expect(html).toContain('/admin/sites/alpha/selection/5/edit');
    expect(html).toContain('刪除');
  });

  it('does not offer mutations to a reader', () => {
    const html = renderToStaticMarkup(<SelectionManager siteSlug="alpha" items={[selection]} canWrite={false} canDelete={false} />);

    expect(html).toContain('第一期選配作業');
    expect(html).not.toContain('新增選配作業');
    expect(html).not.toContain('編輯');
    expect(html).not.toContain('刪除');
  });
});
