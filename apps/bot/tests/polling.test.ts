import { describe, expect, it, vi } from 'vitest';
import { assertPollingAvailable, runPolling } from '../src/polling.js';
import { TelegramApiError } from '../src/telegram.js';

describe('long polling lifecycle', () => {
  it('refuses a configured webhook without deleting it', async () => {
    const call = vi.fn().mockResolvedValue({url: 'https://example.com/telegram/webhook', pending_update_count: 2});
    await expect(assertPollingAvailable({call})).rejects.toThrow('Webhook is active');
    expect(call).toHaveBeenCalledTimes(1);
    expect(call.mock.calls[0]?.[0]).toBe('getWebhookInfo');
  });
  it('acknowledges only completed updates and retries the failed update', async () => {
    const controller = new AbortController();
    const call = vi.fn()
      .mockResolvedValueOnce([{update_id: 10}, {update_id: 11}])
      .mockResolvedValueOnce([{update_id: 11}])
      .mockImplementationOnce(async () => {controller.abort(); return [];});
    const handle = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('temporary')).mockResolvedValueOnce(undefined);
    const sleep = vi.fn(async () => {});
    await runPolling({call}, handle, controller.signal, vi.fn(), sleep);
    expect(call.mock.calls.map((args) => args[1].offset)).toEqual([0, 11, 12]);
    expect(handle.mock.calls.map((args) => args[0].update_id)).toEqual([10, 11, 11]);
    expect(sleep).toHaveBeenCalledWith(1000);
  });
  it('honors rate limits', async () => {
    const controller = new AbortController();
    const call = vi.fn().mockRejectedValueOnce(new TelegramApiError(429, 12)).mockImplementationOnce(async () => {controller.abort(); return [];});
    const sleep = vi.fn(async () => {});
    await runPolling({call}, vi.fn(), controller.signal, vi.fn(), sleep);
    expect(sleep).toHaveBeenCalledWith(12_000);
  });
  it.each([401, 404, 409])('stops on fatal Telegram error %s', async (code) => {
    const call = vi.fn().mockRejectedValue(new TelegramApiError(code));
    const sleep = vi.fn();
    await expect(runPolling({call}, vi.fn(), new AbortController().signal, vi.fn(), sleep)).rejects.toMatchObject({code});
    expect(sleep).not.toHaveBeenCalled();
  });
  it('exits cleanly when the pending HTTP request is aborted', async () => {
    const controller = new AbortController();
    const call = vi.fn(async () => {controller.abort(); throw new TelegramApiError(0);});
    await expect(runPolling({call}, vi.fn(), controller.signal)).resolves.toBeUndefined();
  });
});
