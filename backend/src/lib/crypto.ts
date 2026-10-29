import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const IV_BYTES = 12;
const TAG_BYTES = 16;

/** AES-256-GCM: iv(12) ‖ ciphertext ‖ authTag(16), IV aleatório por registro (SPEC-04 §2.2). */
export class FieldCipher {
  private readonly key: Buffer;

  constructor(base64Key: string) {
    this.key = Buffer.from(base64Key, 'base64');
    if (this.key.length !== 32) throw new Error('DATA_ENC_KEY deve ter 32 bytes');
  }

  encrypt(text: string): Buffer {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const body = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, body, cipher.getAuthTag()]);
  }

  decrypt(data: Uint8Array): string {
    const buf = Buffer.from(data);
    if (buf.length < IV_BYTES + TAG_BYTES) throw new Error('Texto cifrado inválido');
    const iv = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(buf.length - TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(buf.subarray(IV_BYTES, buf.length - TAG_BYTES)),
      decipher.final(),
    ]).toString('utf8');
  }
}
