import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GoogleDriveLinksField from './GoogleDriveLinksField';

describe('GoogleDriveLinksField', () => {
  it('renders one empty URL field and sharing guidance for an empty value', () => {
    const html = renderToStaticMarkup(<GoogleDriveLinksField value={[]} onChange={() => undefined} />);

    expect(html).toContain('Google Drive URL');
    expect((html.match(/type="url"/g) ?? []).length).toBe(1);
    expect(html).toContain('新增檔案連結');
    expect(html).toContain('取得連結者可檢視');
  });

  it('renders every existing URL with a remove control', () => {
    const html = renderToStaticMarkup(
      <GoogleDriveLinksField
        value={['https://drive.google.com/file/d/one/view', 'https://drive.google.com/file/d/two/view']}
        onChange={() => undefined}
      />,
    );

    expect((html.match(/type="url"/g) ?? []).length).toBe(2);
    expect((html.match(/>移除<\/button>/g) ?? []).length).toBe(2);
  });
});
