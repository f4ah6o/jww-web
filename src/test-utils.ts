/**
 * Test Utilities for JWW Parser
 * Provides binary writing utilities for creating test JWW files
 */

/**
 * JWW Binary Writer
 * Utility class for writing binary data in little-endian format
 */
export class JwwBinaryWriter {
  private buffer: Uint8Array;
  private position: number = 0;
  private capacity: number = 4096; // Initial capacity

  constructor(initialCapacity: number = 4096) {
    this.buffer = new Uint8Array(initialCapacity);
    this.capacity = initialCapacity;
  }

  /**
   * Ensure buffer has enough space for additional bytes
   */
  private ensureCapacity(additionalBytes: number) {
    const requiredCapacity = this.position + additionalBytes;
    if (requiredCapacity > this.capacity) {
      // Double the capacity until it's sufficient
      let newCapacity = this.capacity;
      while (newCapacity < requiredCapacity) {
        newCapacity *= 2;
      }

      const newBuffer = new Uint8Array(newCapacity);
      newBuffer.set(this.buffer.subarray(0, this.position));
      this.buffer = newBuffer;
      this.capacity = newCapacity;
    }
  }

  /**
   * Write a single byte
   */
  writeByte(value: number) {
    this.ensureCapacity(1);
    this.buffer[this.position++] = value & 0xFF;
  }

  /**
   * Write unsigned 16-bit integer (little-endian)
   */
  writeUInt16(value: number) {
    this.ensureCapacity(2);
    this.buffer[this.position++] = value & 0xFF;
    this.buffer[this.position++] = (value >> 8) & 0xFF;
  }

  /**
   * Write signed 16-bit integer (little-endian)
   */
  writeInt16(value: number) {
    // Handle negative numbers
    if (value < 0) {
      value = 0x10000 + value;
    }
    this.writeUInt16(value);
  }

  /**
   * Write unsigned 32-bit integer (little-endian)
   */
  writeUInt32(value: number) {
    this.ensureCapacity(4);
    this.buffer[this.position++] = value & 0xFF;
    this.buffer[this.position++] = (value >> 8) & 0xFF;
    this.buffer[this.position++] = (value >> 16) & 0xFF;
    this.buffer[this.position++] = (value >> 24) & 0xFF;
  }

  /**
   * Write signed 32-bit integer (little-endian)
   */
  writeInt32(value: number) {
    // Handle negative numbers
    if (value < 0) {
      value = 0x100000000 + value;
    }
    this.writeUInt32(value);
  }

  /**
   * Write 32-bit float (little-endian)
   */
  writeFloat(value: number) {
    const array = new Float32Array([value]);
    const bytes = new Uint8Array(array.buffer);
    this.ensureCapacity(4);
    for (let i = 0; i < 4; i++) {
      this.buffer[this.position++] = bytes[i];
    }
  }

  /**
   * Write 64-bit double (little-endian)
   */
  writeDouble(value: number) {
    const array = new Float64Array([value]);
    const bytes = new Uint8Array(array.buffer);
    this.ensureCapacity(8);
    for (let i = 0; i < 8; i++) {
      this.buffer[this.position++] = bytes[i];
    }
  }

  /**
   * Write string (null-terminated or padded)
   */
  writeString(value: string, fixedLength?: number) {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(value);

    if (fixedLength) {
      // Fixed-length field with padding
      this.ensureCapacity(fixedLength);
      for (let i = 0; i < fixedLength; i++) {
        this.buffer[this.position++] = i < encoded.length ? encoded[i] : 0;
      }
    } else {
      // Variable-length with null terminator
      this.ensureCapacity(encoded.length + 1);
      for (let i = 0; i < encoded.length; i++) {
        this.buffer[this.position++] = encoded[i];
      }
      this.buffer[this.position++] = 0; // null terminator
    }
  }

  /**
   * Write raw bytes
   */
  writeBytes(bytes: Uint8Array) {
    this.ensureCapacity(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer[this.position++] = bytes[i];
    }
  }

  /**
   * Skip (write zeros) for a number of bytes
   */
  skip(count: number) {
    this.ensureCapacity(count);
    for (let i = 0; i < count; i++) {
      this.buffer[this.position++] = 0;
    }
  }

  /**
   * Get the current write position
   */
  getPosition(): number {
    return this.position;
  }

  /**
   * Set the write position
   */
  setPosition(position: number) {
    if (position < 0 || position > this.capacity) {
      throw new Error(`Invalid position: ${position}`);
    }
    this.position = position;
  }

  /**
   * Get the written buffer (trimmed to actual size)
   */
  getBuffer(): ArrayBuffer {
    return this.buffer.subarray(0, this.position).buffer;
  }

  /**
   * Get the written buffer as Uint8Array
   */
  getBytes(): Uint8Array {
    return this.buffer.subarray(0, this.position);
  }

  /**
   * Get buffer size
   */
  size(): number {
    return this.position;
  }

  /**
   * Clear the buffer
   */
  clear() {
    this.position = 0;
  }

  /**
   * Dump buffer as hex string (for debugging)
   */
  toHexString(): string {
    const bytes = this.getBytes();
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      result += bytes[i].toString(16).padStart(2, '0') + ' ';
      if ((i + 1) % 16 === 0) {
        result += '\n';
      }
    }
    return result;
  }
}

/**
 * Test data generators
 */

export function generateTestLine(
  startX: number = 0,
  startY: number = 0,
  endX: number = 100,
  endY: number = 100
): Uint8Array {
  const writer = new JwwBinaryWriter();

  writer.writeByte(0x01); // line type
  writer.writeByte(0);    // layer
  writer.writeByte(1);    // color
  writer.writeByte(0);    // lineType
  writer.writeUInt16(100); // lineWidth
  writer.writeByte(0);    // group
  writer.writeByte(0);    // reserved

  writer.writeInt32(startX * 100);
  writer.writeInt32(startY * 100);
  writer.writeInt32(endX * 100);
  writer.writeInt32(endY * 100);

  return writer.getBytes();
}

export function generateTestCircle(
  centerX: number = 0,
  centerY: number = 0,
  radius: number = 25
): Uint8Array {
  const writer = new JwwBinaryWriter();

  writer.writeByte(0x02); // circle type
  writer.writeByte(0);    // layer
  writer.writeByte(2);    // color
  writer.writeByte(0);    // lineType
  writer.writeUInt16(100); // lineWidth
  writer.writeByte(0);    // group
  writer.writeByte(0);    // reserved

  writer.writeInt32(centerX * 100);
  writer.writeInt32(centerY * 100);
  writer.writeInt32(radius * 100);

  return writer.getBytes();
}

export function generateTestArc(
  centerX: number = 0,
  centerY: number = 0,
  radius: number = 25,
  startAngleDeg: number = 0,
  endAngleDeg: number = 90
): Uint8Array {
  const writer = new JwwBinaryWriter();

  writer.writeByte(0x03); // arc type
  writer.writeByte(0);    // layer
  writer.writeByte(3);    // color
  writer.writeByte(0);    // lineType
  writer.writeUInt16(100); // lineWidth
  writer.writeByte(0);    // group
  writer.writeByte(0);    // reserved

  writer.writeInt32(centerX * 100);
  writer.writeInt32(centerY * 100);
  writer.writeInt32(radius * 100);
  writer.writeInt16(startAngleDeg);
  writer.writeInt16(endAngleDeg);
  writer.writeByte(0); // flags

  return writer.getBytes();
}

export function generateTestText(
  x: number = 0,
  y: number = 0,
  text: string = 'Test'
): Uint8Array {
  const writer = new JwwBinaryWriter();

  writer.writeByte(0x04); // text type
  writer.writeByte(0);    // layer
  writer.writeByte(1);    // color
  writer.writeByte(0);    // lineType
  writer.writeUInt16(100); // lineWidth
  writer.writeByte(0);    // group
  writer.writeByte(0);    // reserved

  writer.writeInt32(x * 100);
  writer.writeInt32(y * 100);
  writer.writeInt16(20 * 100);  // height
  writer.writeInt16(10 * 100);  // width
  writer.writeInt16(0);         // angle
  writer.writeByte(0);          // alignFlags
  writer.writeString('MS Gothic', 32);
  writer.writeUInt16(text.length);
  writer.writeString(text, text.length);

  return writer.getBytes();
}

export function generateTestEllipse(
  centerX: number = 0,
  centerY: number = 0,
  radiusX: number = 50,
  radiusY: number = 25,
  rotationDeg: number = 0
): Uint8Array {
  const writer = new JwwBinaryWriter();

  writer.writeByte(0x05); // ellipse type
  writer.writeByte(0);    // layer
  writer.writeByte(4);    // color
  writer.writeByte(0);    // lineType
  writer.writeUInt16(100); // lineWidth
  writer.writeByte(0);    // group
  writer.writeByte(0);    // reserved

  writer.writeInt32(centerX * 100);
  writer.writeInt32(centerY * 100);
  writer.writeInt32(radiusX * 100);
  writer.writeInt32(radiusY * 100);
  writer.writeInt16(rotationDeg);

  return writer.getBytes();
}

export function generateTestDimension(
  startX: number = 0,
  startY: number = 0,
  endX: number = 100,
  endY: number = 0,
  value: number = 100
): Uint8Array {
  const writer = new JwwBinaryWriter();

  writer.writeByte(0x06); // dimension type
  writer.writeByte(0);    // layer
  writer.writeByte(1);    // color
  writer.writeByte(0);    // lineType
  writer.writeUInt16(100); // lineWidth
  writer.writeByte(0);    // group
  writer.writeByte(0);    // reserved

  writer.writeInt32(startX * 100);
  writer.writeInt32(startY * 100);
  writer.writeInt32(endX * 100);
  writer.writeInt32(endY * 100);
  writer.writeInt32(50 * 100);  // textX
  writer.writeInt32(5 * 100);   // textY
  writer.writeInt32(value * 1000);
  writer.writeByte(0);  // linear type
  writer.writeUInt16(0); // no custom text

  return writer.getBytes();
}

export function generateTestPolyline(
  points: Array<{ x: number; y: number }> = [
    { x: 0, y: 0 },
    { x: 50, y: 0 },
    { x: 50, y: 50 }
  ],
  closed: boolean = false
): Uint8Array {
  const writer = new JwwBinaryWriter();

  writer.writeByte(0x07); // polyline type
  writer.writeByte(0);    // layer
  writer.writeByte(5);    // color
  writer.writeByte(0);    // lineType
  writer.writeUInt16(100); // lineWidth
  writer.writeByte(0);    // group
  writer.writeByte(0);    // reserved

  writer.writeUInt16(points.length);
  writer.writeByte(closed ? 1 : 0);
  writer.writeByte(0); // reserved

  for (const point of points) {
    writer.writeInt32(point.x * 100);
    writer.writeInt32(point.y * 100);
  }

  return writer.getBytes();
}
