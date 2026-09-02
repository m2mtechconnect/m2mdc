import { describe, expect, it } from 'vitest';
import zodDefault, * as zodNamespace from 'zod';
import { z } from 'zod';

describe('Zod runtime contract', () => {
  it('exposes the named, namespace, and default validation APIs to Vitest', () => {
    expect({
      named: typeof z,
      namedObject: typeof z?.object,
      namespace: typeof zodNamespace.z,
      namespaceObject: typeof zodNamespace.z?.object,
      default: typeof zodDefault,
      defaultObject: typeof zodDefault?.object,
      namespaceKeys: Object.keys(zodNamespace).slice(0, 10),
    }).toEqual({
      named: 'object',
      namedObject: 'function',
      namespace: 'object',
      namespaceObject: 'function',
      default: 'object',
      defaultObject: 'function',
      namespaceKeys: expect.any(Array),
    });
  });
});
