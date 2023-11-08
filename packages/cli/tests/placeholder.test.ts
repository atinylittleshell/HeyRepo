import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.clearAllMocks();
});

test('placeholder test case', async () => {
  expect(0).toBeFalsy();
});
