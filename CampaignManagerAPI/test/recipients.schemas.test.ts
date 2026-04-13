import { describe, expect, it } from 'vitest';
import { createRecipientBodySchema } from '../src/modules/recipients/recipients.schemas.js';

describe('createRecipientBodySchema', () => {
  it('accepts email and optional name', () => {
    const a = createRecipientBodySchema.parse({ email: 'Test@Example.com', name: '  Pat  ' });
    expect(a.email).toBe('Test@Example.com');
    expect(a.name).toBe('Pat');
  });

  it('rejects invalid email', () => {
    expect(() => createRecipientBodySchema.parse({ email: 'not-an-email' })).toThrow();
  });
});
