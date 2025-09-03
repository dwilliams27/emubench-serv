export function formatError(error: unknown) {
  return `${(error as any).message || ''} ${(error as any).response?.data || ''}`.trim();
}
