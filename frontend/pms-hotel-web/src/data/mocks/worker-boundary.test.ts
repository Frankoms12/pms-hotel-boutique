import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const publicRoot = resolve(process.cwd(), 'public');
const generatedWorker = readFileSync(resolve(publicRoot, 'mockServiceWorker.js'), 'utf8');
const protectedWorker = readFileSync(resolve(publicRoot, 'pmsMockServiceWorker.js'), 'utf8');
const origin = 'http://localhost:3001';

/** Execute the real browser worker scripts and dispatch a controlled FetchEvent. */
function workerHarness(source = protectedWorker) {
  const fetchListeners: Array<(event: Event) => void> = [];
  const networkFetch = vi.fn(async () => new Response('native-network-response'));
  const addEventListener = (type: string, listener: (event: Event) => void) => {
    if (type === 'fetch') fetchListeners.push(listener);
  };
  const worker = {
    addEventListener, location: { origin },
    clients: { get: async () => undefined, matchAll: async () => [] },
  };
  const context = createContext({
    self: worker, addEventListener, URL, Headers, Response,
    crypto: { randomUUID: () => 'worker-test-request' }, fetch: networkFetch,
    importScripts: (path: string) => {
      expect(path).toBe('/mockServiceWorker.js');
      runInContext(generatedWorker, context);
    },
  });
  runInContext(source, context);
  runInContext("activeClientIds.add('active-browser-client')", context);

  async function dispatch(path: string, method = 'GET') {
    let stopped = false;
    let workerResponse: Promise<Response> | undefined;
    const respondWith = vi.fn((response: Promise<Response>) => { workerResponse = response; });
    const event = {
      request: new Request(new URL(path, origin), { method }),
      clientId: 'active-browser-client', respondWith,
      stopImmediatePropagation: () => { stopped = true; },
    };
    for (const listener of fetchListeners) {
      listener(event as unknown as Event);
      if (stopped) break;
    }
    if (workerResponse) await workerResponse;
    return { stopped, respondWith };
  }
  return { dispatch, networkFetch };
}

describe('Staff reservations boundary before MSW', () => {
  it('reproduces the original interception even for a request passed through to the network', async () => {
    const worker = workerHarness(generatedWorker);
    const event = await worker.dispatch('/api/staff/reservations?propertyId=real-property');
    expect(event.respondWith).toHaveBeenCalledOnce();
    expect(worker.networkFetch).toHaveBeenCalledOnce();
  });

  it.each([
    '/api/staff/reservations?propertyId=real-property',
    '/api/staff/reservations/11111111-1111-1111-1111-111111111111?propertyId=real-property',
    '/api/staff/reservations',
    '/api/staff/reservations/invalid?propertyId=invalid',
    '/api/staff/reservations/?propertyId=real-property',
  ])('does not enter MSW or respondWith for the real BFF read %s', async path => {
    const worker = workerHarness();
    const event = await worker.dispatch(path);
    expect(event.stopped).toBe(true);
    expect(event.respondWith).not.toHaveBeenCalled();
    // The worker neither forwards nor clones this request: the browser performs it.
    expect(worker.networkFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['http://pms.test/contract/reservations?propertyId=GT-HB-01', 'GET'],
    ['http://pms.test/contract/reservations/HB-2026-08421', 'GET'],
    ['/__mock/staff-reservations/GT-HB-01/quotes', 'GET'],
    ['/api/v1/private/rates', 'GET'],
    ['/api/v1/public/availability', 'GET'],
    ['/api/auth/staff/refresh', 'POST'],
    ['/api/staff/reservations', 'POST'],
    ['/api/staff/reservations/id/cancellation-preview', 'GET'],
    ['http://other.example.test/api/staff/reservations', 'GET'],
  ])('preserves the existing worker behavior for %s %s', async (path, method) => {
    const worker = workerHarness();
    const event = await worker.dispatch(path, method);
    expect(event.stopped).toBe(false);
    expect(event.respondWith).toHaveBeenCalledOnce();
    expect(worker.networkFetch).toHaveBeenCalledOnce();
  });
});
