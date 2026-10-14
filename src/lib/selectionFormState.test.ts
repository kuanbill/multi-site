import { describe, expect, it } from 'vitest';
import { moveSelectionAttachment } from './selectionFormState';

describe('moveSelectionAttachment', () => {
  it('moves an attachment one position while preserving the other attachments', () => {
    expect(moveSelectionAttachment(['pdf', 'image', 'second-pdf'], 1, 1))
      .toEqual(['pdf', 'second-pdf', 'image']);
  });

  it('leaves the list unchanged when moving past either end', () => {
    expect(moveSelectionAttachment(['pdf', 'image'], 0, -1)).toEqual(['pdf', 'image']);
    expect(moveSelectionAttachment(['pdf', 'image'], 1, 1)).toEqual(['pdf', 'image']);
  });
});
