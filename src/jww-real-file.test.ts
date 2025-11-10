/**
 * Test with real JWW files
 */

import { describe, it, expect } from 'vitest';
import { JwwParser } from './jww-parser';
import { readFileSync } from 'fs';

describe('Real JWW File - shadow.jww', () => {
  it('should validate JwwData format file', async () => {
    const fileBuffer = readFileSync('/tmp/shadow.jww');
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    const isValid = await JwwParser.validate(arrayBuffer);
    expect(isValid).toBe(true);
  });

  it('should parse JwwData format file', async () => {
    const fileBuffer = readFileSync('/tmp/shadow.jww');
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    const parser = new JwwParser({ skipInvalidEntities: true, strictMode: false });
    const doc = await parser.parse(arrayBuffer);

    expect(doc.header).toBeDefined();
    expect(doc.header.signature).toBeDefined();
    expect(doc.layers).toBeDefined();
    expect(doc.layers.length).toBeGreaterThan(0);
  });

  it('should get file info for JwwData format', async () => {
    const fileBuffer = readFileSync('/tmp/shadow.jww');
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    const info = await JwwParser.getFileInfo(arrayBuffer);
    expect(info.signature).toBeDefined();
    expect(info.fileSize).toBe(166661);
  });
});
