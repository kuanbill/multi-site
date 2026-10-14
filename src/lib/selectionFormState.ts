export function moveSelectionAttachment<T>(items: readonly T[], index: number, delta: -1 | 1): T[] {
  const nextIndex = index + delta;
  if (index < 0 || index >= items.length || nextIndex < 0 || nextIndex >= items.length) return [...items];
  const result = [...items];
  [result[index], result[nextIndex]] = [result[nextIndex], result[index]];
  return result;
}
