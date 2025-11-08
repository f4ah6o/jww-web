/**
 * JWW Test Data Generator
 * Creates mock JWW binary data for testing the parser
 */

export class JwwTestDataBuilder {
  private buffer: number[] = [];

  /**
   * Create a new test data builder
   */
  constructor() {
    this.buffer = [];
  }

  /**
   * Write byte
   */
  writeByte(value: number): this {
    this.buffer.push(value & 0xFF);
    return this;
  }

  /**
   * Write signed byte
   */
  writeSByte(value: number): this {
    const byte = value < 0 ? 256 + value : value;
    this.buffer.push(byte & 0xFF);
    return this;
  }

  /**
   * Write 16-bit unsigned integer (little-endian)
   */
  writeUInt16(value: number): this {
    this.buffer.push(value & 0xFF);
    this.buffer.push((value >> 8) & 0xFF);
    return this;
  }

  /**
   * Write 16-bit signed integer (little-endian)
   */
  writeInt16(value: number): this {
    const uint = value < 0 ? 65536 + value : value;
    this.buffer.push(uint & 0xFF);
    this.buffer.push((uint >> 8) & 0xFF);
    return this;
  }

  /**
   * Write 32-bit unsigned integer (little-endian)
   */
  writeUInt32(value: number): this {
    this.buffer.push(value & 0xFF);
    this.buffer.push((value >> 8) & 0xFF);
    this.buffer.push((value >> 16) & 0xFF);
    this.buffer.push((value >> 24) & 0xFF);
    return this;
  }

  /**
   * Write 32-bit signed integer (little-endian)
   */
  writeInt32(value: number): this {
    const uint = value < 0 ? 4294967296 + value : value;
    this.buffer.push(uint & 0xFF);
    this.buffer.push((uint >> 8) & 0xFF);
    this.buffer.push((uint >> 16) & 0xFF);
    this.buffer.push((uint >> 24) & 0xFF);
    return this;
  }

  /**
   * Write string (ASCII/Shift-JIS)
   */
  writeString(str: string, length: number): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);

    for (let i = 0; i < length; i++) {
      this.buffer.push(i < bytes.length ? bytes[i] : 0);
    }
    return this;
  }

  /**
   * Write padding bytes
   */
  writePadding(count: number): this {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0);
    }
    return this;
  }

  /**
   * Align to boundary
   */
  alignTo(boundary: number): this {
    const remainder = this.buffer.length % boundary;
    if (remainder !== 0) {
      this.writePadding(boundary - remainder);
    }
    return this;
  }

  /**
   * Get the ArrayBuffer
   */
  build(): ArrayBuffer {
    const buffer = new ArrayBuffer(this.buffer.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < this.buffer.length; i++) {
      view[i] = this.buffer[i];
    }
    return buffer;
  }

  /**
   * Get current buffer size
   */
  size(): number {
    return this.buffer.length;
  }
}

/**
 * Create a minimal valid JWW header
 */
export function createJwwHeader(options: {
  version?: number;
  scaleNum?: number;
  scaleDen?: number;
  offsetX?: number;
  offsetY?: number;
  angle?: number;
  layerCount?: number;
  groupCount?: number;
} = {}): ArrayBuffer {
  const builder = new JwwTestDataBuilder();

  // Signature "JWW"
  builder.writeString('JWW', 3);

  // Version
  builder.writeUInt16(options.version ?? 600);

  // Reserved byte
  builder.writeByte(0);

  // Scale (numerator/denominator)
  builder.writeInt32(options.scaleNum ?? 1);
  builder.writeInt32(options.scaleDen ?? 100);

  // Offset (in 0.01mm units)
  builder.writeInt32(options.offsetX ?? 0);
  builder.writeInt32(options.offsetY ?? 0);

  // Rotation angle (in degrees)
  builder.writeInt16(options.angle ?? 0);

  // Reserved
  builder.writePadding(2);

  // Layer and group count
  builder.writeByte(options.layerCount ?? 16);
  builder.writeByte(options.groupCount ?? 16);

  // Align to 256 bytes (header size)
  builder.alignTo(256);

  return builder.build();
}

/**
 * Create layer data
 */
export function createJwwLayers(count: number = 16): ArrayBuffer {
  const builder = new JwwTestDataBuilder();

  for (let i = 0; i < count; i++) {
    // Flags (visible=true, locked=false)
    builder.writeByte(0x01);

    // Color
    builder.writeByte(i % 8);

    // Line type
    builder.writeByte(0);

    // Reserved
    builder.writeByte(0);

    // Layer name
    builder.writeString(`Layer ${i}`, 32);
  }

  return builder.build();
}

/**
 * Create a line entity
 */
export function createLineEntity(options: {
  layer?: number;
  color?: number;
  lineType?: number;
  lineWidth?: number;
  group?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}): ArrayBuffer {
  const builder = new JwwTestDataBuilder();

  // Entity header
  builder.writeByte(0x01); // Line entity type
  builder.writeByte(options.layer ?? 0);
  builder.writeByte(options.color ?? 0);
  builder.writeByte(options.lineType ?? 0);
  builder.writeUInt16((options.lineWidth ?? 0.25) * 100); // 0.01mm units
  builder.writeByte(options.group ?? 0);
  builder.writeByte(0); // Reserved

  // Line coordinates (in 0.01mm units)
  builder.writeInt32((options.startX ?? 0) * 100);
  builder.writeInt32((options.startY ?? 0) * 100);
  builder.writeInt32((options.endX ?? 100) * 100);
  builder.writeInt32((options.endY ?? 100) * 100);

  return builder.build();
}

/**
 * Create a circle entity
 */
export function createCircleEntity(options: {
  layer?: number;
  color?: number;
  centerX?: number;
  centerY?: number;
  radius?: number;
}): ArrayBuffer {
  const builder = new JwwTestDataBuilder();

  // Entity header
  builder.writeByte(0x02); // Circle entity type
  builder.writeByte(options.layer ?? 0);
  builder.writeByte(options.color ?? 1);
  builder.writeByte(0); // Line type
  builder.writeUInt16(25); // Line width 0.25mm
  builder.writeByte(0); // Group
  builder.writeByte(0); // Reserved

  // Circle data (in 0.01mm units)
  builder.writeInt32((options.centerX ?? 50) * 100);
  builder.writeInt32((options.centerY ?? 50) * 100);
  builder.writeInt32((options.radius ?? 25) * 100);

  return builder.build();
}

/**
 * Create an arc entity
 */
export function createArcEntity(options: {
  layer?: number;
  centerX?: number;
  centerY?: number;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  clockwise?: boolean;
}): ArrayBuffer {
  const builder = new JwwTestDataBuilder();

  // Entity header
  builder.writeByte(0x03); // Arc entity type
  builder.writeByte(options.layer ?? 0);
  builder.writeByte(2); // Color: green
  builder.writeByte(0); // Line type
  builder.writeUInt16(25); // Line width
  builder.writeByte(0); // Group
  builder.writeByte(0); // Reserved

  // Arc data (in 0.01mm units)
  builder.writeInt32((options.centerX ?? 50) * 100);
  builder.writeInt32((options.centerY ?? 50) * 100);
  builder.writeInt32((options.radius ?? 30) * 100);

  // Angles in degrees
  builder.writeInt16(options.startAngle ?? 0);
  builder.writeInt16(options.endAngle ?? 90);

  // Flags
  builder.writeByte(options.clockwise ? 0x01 : 0x00);

  return builder.build();
}

/**
 * Create a text entity
 */
export function createTextEntity(options: {
  layer?: number;
  x?: number;
  y?: number;
  text?: string;
  height?: number;
  width?: number;
  angle?: number;
}): ArrayBuffer {
  const builder = new JwwTestDataBuilder();
  const text = options.text ?? 'Test Text';

  // Entity header
  builder.writeByte(0x04); // Text entity type
  builder.writeByte(options.layer ?? 0);
  builder.writeByte(0); // Color: black
  builder.writeByte(0); // Line type
  builder.writeUInt16(0); // Line width
  builder.writeByte(0); // Group
  builder.writeByte(0); // Reserved

  // Text position (in 0.01mm units)
  builder.writeInt32((options.x ?? 10) * 100);
  builder.writeInt32((options.y ?? 10) * 100);

  // Text size (in 0.01mm units)
  builder.writeInt16((options.height ?? 5) * 100);
  builder.writeInt16((options.width ?? 5) * 100);

  // Angle in degrees
  builder.writeInt16(options.angle ?? 0);

  // Alignment (left-bottom)
  builder.writeByte(0x00);

  // Font name
  builder.writeString('MS Gothic', 32);

  // Text content
  builder.writeUInt16(text.length);
  builder.writeString(text, text.length);

  return builder.build();
}

/**
 * Create an ellipse entity
 */
export function createEllipseEntity(options: {
  layer?: number;
  centerX?: number;
  centerY?: number;
  radiusX?: number;
  radiusY?: number;
  rotation?: number;
}): ArrayBuffer {
  const builder = new JwwTestDataBuilder();

  // Entity header
  builder.writeByte(0x05); // Ellipse entity type
  builder.writeByte(options.layer ?? 0);
  builder.writeByte(3); // Color: blue
  builder.writeByte(0); // Line type
  builder.writeUInt16(25); // Line width
  builder.writeByte(0); // Group
  builder.writeByte(0); // Reserved

  // Ellipse data (in 0.01mm units)
  builder.writeInt32((options.centerX ?? 50) * 100);
  builder.writeInt32((options.centerY ?? 50) * 100);
  builder.writeInt32((options.radiusX ?? 40) * 100);
  builder.writeInt32((options.radiusY ?? 20) * 100);

  // Rotation angle in degrees
  builder.writeInt16(options.rotation ?? 0);

  return builder.build();
}

/**
 * Create a dimension entity
 */
export function createDimensionEntity(options: {
  layer?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  value?: number;
  text?: string;
}): ArrayBuffer {
  const builder = new JwwTestDataBuilder();
  const text = options.text ?? options.value?.toFixed(2) ?? '100.00';

  // Entity header
  builder.writeByte(0x06); // Dimension entity type
  builder.writeByte(options.layer ?? 0);
  builder.writeByte(4); // Color: yellow
  builder.writeByte(0); // Line type
  builder.writeUInt16(20); // Line width
  builder.writeByte(0); // Group
  builder.writeByte(0); // Reserved

  // Dimension points (in 0.01mm units)
  builder.writeInt32((options.startX ?? 0) * 100);
  builder.writeInt32((options.startY ?? 0) * 100);
  builder.writeInt32((options.endX ?? 100) * 100);
  builder.writeInt32((options.endY ?? 0) * 100);

  // Text position
  builder.writeInt32((options.startX ?? 0 + options.endX ?? 100) * 50);
  builder.writeInt32(((options.startY ?? 0) + 10) * 100);

  // Value in 0.001mm units
  builder.writeInt32((options.value ?? 100) * 1000);

  // Dimension type (0 = linear)
  builder.writeByte(0);

  // Text
  builder.writeUInt16(text.length);
  builder.writeString(text, text.length);

  return builder.build();
}

/**
 * Create a polyline entity
 */
export function createPolylineEntity(options: {
  layer?: number;
  points?: Array<{ x: number; y: number }>;
  closed?: boolean;
}): ArrayBuffer {
  const builder = new JwwTestDataBuilder();
  const points = options.points ?? [
    { x: 0, y: 0 },
    { x: 50, y: 25 },
    { x: 100, y: 0 }
  ];

  // Entity header
  builder.writeByte(0x07); // Polyline entity type
  builder.writeByte(options.layer ?? 0);
  builder.writeByte(5); // Color: magenta
  builder.writeByte(0); // Line type
  builder.writeUInt16(30); // Line width
  builder.writeByte(0); // Group
  builder.writeByte(0); // Reserved

  // Point count
  builder.writeUInt16(points.length);

  // Flags
  builder.writeByte(options.closed ? 0x01 : 0x00);
  builder.writeByte(0); // Reserved

  // Points (in 0.01mm units)
  for (const point of points) {
    builder.writeInt32(point.x * 100);
    builder.writeInt32(point.y * 100);
  }

  return builder.build();
}

/**
 * Combine multiple ArrayBuffers
 */
export function combineBuffers(...buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const buffer of buffers) {
    result.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  return result.buffer;
}

/**
 * Create a complete JWW file with multiple entities
 */
export function createCompleteJwwFile(options: {
  includeLines?: boolean;
  includeCircles?: boolean;
  includeArcs?: boolean;
  includeText?: boolean;
  includeEllipses?: boolean;
  includeDimensions?: boolean;
  includePolylines?: boolean;
} = {}): ArrayBuffer {
  const entities: ArrayBuffer[] = [];

  // Add various entities based on options
  if (options.includeLines !== false) {
    entities.push(createLineEntity({ startX: 0, startY: 0, endX: 100, endY: 0 }));
    entities.push(createLineEntity({ startX: 0, startY: 0, endX: 0, endY: 100 }));
  }

  if (options.includeCircles !== false) {
    entities.push(createCircleEntity({ centerX: 50, centerY: 50, radius: 25 }));
  }

  if (options.includeArcs !== false) {
    entities.push(createArcEntity({ centerX: 75, centerY: 75, radius: 30 }));
  }

  if (options.includeText !== false) {
    entities.push(createTextEntity({ x: 10, y: 90, text: 'JWW Test' }));
  }

  if (options.includeEllipses !== false) {
    entities.push(createEllipseEntity({ centerX: 50, centerY: 25, radiusX: 40, radiusY: 15 }));
  }

  if (options.includeDimensions !== false) {
    entities.push(createDimensionEntity({ startX: 0, startY: -10, endX: 100, endY: -10, value: 100 }));
  }

  if (options.includePolylines !== false) {
    entities.push(createPolylineEntity({
      points: [{ x: 0, y: 50 }, { x: 25, y: 75 }, { x: 50, y: 50 }, { x: 75, y: 75 }, { x: 100, y: 50 }]
    }));
  }

  // End marker
  const endMarker = new JwwTestDataBuilder().writeByte(0x00).build();

  return combineBuffers(
    createJwwHeader(),
    createJwwLayers(),
    ...entities,
    endMarker
  );
}
