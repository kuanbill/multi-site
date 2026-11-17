import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const adminDirectory = dirname(fileURLToPath(import.meta.url));

function readComponent(name: string) {
  return readFileSync(join(adminDirectory, name), 'utf8');
}

describe('responsive admin form contracts', () => {
  it('gives shared controls a touch target, mobile-safe font size, and visible focus state', () => {
    for (const name of ['Input.tsx', 'Select.tsx', 'TextArea.tsx', 'DateInput.tsx', 'NumberInput.tsx']) {
      const source = readComponent(name);
      expect(source, name).toContain('min-h-11');
      expect(source, name).toContain('text-base sm:text-sm');
      expect(source, name).toContain('focus-visible:');
    }

    const checkbox = readComponent('Checkbox.tsx');
    expect(checkbox).toContain('min-h-11');
  });

  it('keeps media selection and form actions usable at 320px', () => {
    const mediaPicker = readComponent('MediaPicker.tsx');
    expect(mediaPicker).toContain('min-h-11');
    expect(mediaPicker).toContain('p-4 sm:p-6');
    expect(mediaPicker).toContain('flex-wrap');
    expect(mediaPicker).toContain('role="dialog"');
    expect(mediaPicker).toContain('aria-modal="true"');
    expect(mediaPicker).toContain("const focusable = Array.from");
    expect(mediaPicker).toContain("event.key !== 'Tab'");
    expect(mediaPicker.match(/closeModal\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(3);

    const sourceRoot = join(adminDirectory, '..', '..', 'app', 'admin');
    const formFiles = [
      ['users', 'UserForm.tsx'],
      ['sites', '[siteSlug]', 'home', 'HomeForm.tsx'],
      ['sites', '[siteSlug]', 'announcement', 'AnnouncementForm.tsx'],
      ['sites', '[siteSlug]', 'exhibition', 'ExhibitionForm.tsx'],
      ['sites', '[siteSlug]', 'meeting', 'MeetingForm.tsx'],
      ['sites', '[siteSlug]', 'progress', 'ProgressForm.tsx'],
      ['sites', '[siteSlug]', 'selection', 'SelectionForm.tsx'],
      ['sites', '[siteSlug]', 'vendors', 'VendorForm.tsx'],
      ['sites', '[siteSlug]', 'maps', 'MapForm.tsx'],
      ['sites', '[siteSlug]', '[...featureRoute]', 'FeatureEntryForm.tsx'],
    ];

    for (const segments of formFiles) {
      const source = readFileSync(join(sourceRoot, ...segments), 'utf8');
      expect(source, segments.join('/')).toContain('flex-wrap');
      expect(source, segments.join('/')).toContain('min-h-11');
    }
  });

  it('keeps the map form reference across async submission', () => {
    const mapForm = readFileSync(
      join(adminDirectory, '..', '..', 'app', 'admin', 'sites', '[siteSlug]', 'maps', 'MapForm.tsx'),
      'utf8',
    );

    expect(mapForm).toContain('const formElement = event.currentTarget;');
    expect(mapForm).toContain('const form = new FormData(formElement);');
    expect(mapForm).toContain('formElement.reset();');
    expect(mapForm).not.toContain('event.currentTarget.reset()');
  });

  it('exposes a delete action for each map asset', () => {
    const mapsPage = readFileSync(
      join(adminDirectory, '..', '..', 'app', 'admin', 'sites', '[siteSlug]', 'maps', 'page.tsx'),
      'utf8',
    );

    expect(mapsPage).toContain("import DeleteMapButton from './DeleteMapButton';");
    expect(mapsPage).toContain('<DeleteMapButton siteSlug={siteSlug} id={item.id} title={item.title} />');
  });
});
