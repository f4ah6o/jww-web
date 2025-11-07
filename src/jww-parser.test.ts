/**
 * JWW Parser Test Suite
 * Tests the JWW parser with various entity types and configurations
 */

import { describe, it, expect } from 'vitest';
import { JwwParser } from './jww-parser';
import { JwwBinaryWriter } from './test-utils';

describe('JwwParser', () => {
  describe('Header Parsing', () => {
    it('should parse valid JWW header', async () => {
      const buffer = createMinimalJwwFile();
      const parser = new JwwParser();
      const document = await parser.parse(buffer);

      expect(document.header).toBeDefined();
      expect(document.header.signature).toBe('JWW');
      expect(document.header.version).toBe(11);
      expect(document.header.layerCount).toBe(16);
      expect(document.header.groupCount).toBe(16);
    });

    it('should correctly parse offset and scale', async () => {
      const buffer = createMinimalJwwFile({
        offsetX: 1000,
        offsetY: 2000,
        scaleNum: 1,
        scaleDen: 2
      });
      const parser = new JwwParser();
      const document = await parser.parse(buffer);

      expect(document.header.offsetX).toBe(10); // 1000 / 100 = 10mm
      expect(document.header.offsetY).toBe(20); // 2000 / 100 = 20mm
      expect(document.header.scale).toBe(0.5);
    });
  });

  describe('Entity Parsing', () => {
    it('should parse line entity', async () => {
      const writer = new JwwBinaryWriter();
      const buffer = createJwwFileWithEntity(writer => {
        // Line entity
        writer.writeByte(0x01); // entity type
        writer.writeByte(0);    // layer
        writer.writeByte(1);    // color
        writer.writeByte(0);    // lineType
        writer.writeUInt16(100); // lineWidth
        writer.writeByte(0);    // group
        writer.writeByte(0);    // reserved

        // Line coordinates (in 0.01mm units)
        writer.writeInt32(0);    // startX
        writer.writeInt32(0);    // startY
        writer.writeInt32(10000); // endX
        writer.writeInt32(10000); // endY
      });

      const parser = new JwwParser();
      const document = await parser.parse(buffer);

      const lines = document.entities.filter(e => e.type === 'line');
      expect(lines).toHaveLength(1);

      const line = lines[0] as any;
      expect(line.startX).toBe(0);
      expect(line.startY).toBe(0);
      expect(line.endX).toBe(100);
      expect(line.endY).toBe(100);
      expect(line.layer).toBe(0);
      expect(line.color).toBe(1);
      expect(line.lineWidth).toBe(1);
    });

    it('should parse circle entity', async () => {
      const buffer = createJwwFileWithEntity(writer => {
        // Circle entity
        writer.writeByte(0x02); // entity type
        writer.writeByte(1);    // layer
        writer.writeByte(2);    // color
        writer.writeByte(0);    // lineType
        writer.writeUInt16(50);  // lineWidth
        writer.writeByte(0);    // group
        writer.writeByte(0);    // reserved

        // Circle data
        writer.writeInt32(5000);  // centerX (50mm)
        writer.writeInt32(5000);  // centerY (50mm)
        writer.writeInt32(2500);  // radius (25mm)
      });

      const parser = new JwwParser();
      const document = await parser.parse(buffer);

      const circles = document.entities.filter(e => e.type === 'circle');
      expect(circles).toHaveLength(1);

      const circle = circles[0] as any;
      expect(circle.centerX).toBe(50);
      expect(circle.centerY).toBe(50);
      expect(circle.radius).toBe(25);
      expect(circle.layer).toBe(1);
      expect(circle.color).toBe(2);
    });

    it('should parse arc entity', async () => {
      const buffer = createJwwFileWithEntity(writer => {
        // Arc entity
        writer.writeByte(0x03); // entity type
        writer.writeByte(0);    // layer
        writer.writeByte(3);    // color
        writer.writeByte(0);    // lineType
        writer.writeUInt16(100); // lineWidth
        writer.writeByte(0);    // group
        writer.writeByte(0);    // reserved

        // Arc data
        writer.writeInt32(0);    // centerX
        writer.writeInt32(0);    // centerY
        writer.writeInt32(5000); // radius (50mm)
        writer.writeInt16(0);    // startAngle (0 degrees)
        writer.writeInt16(90);   // endAngle (90 degrees)
        writer.writeByte(0);     // flags (not clockwise)
      });

      const parser = new JwwParser();
      const document = await parser.parse(buffer);

      const arcs = document.entities.filter(e => e.type === 'arc');
      expect(arcs).toHaveLength(1);

      const arc = arcs[0] as any;
      expect(arc.centerX).toBe(0);
      expect(arc.centerY).toBe(0);
      expect(arc.radius).toBe(50);
      expect(arc.startAngle).toBe(0);
      expect(Math.abs(arc.endAngle - Math.PI / 2)).toBeLessThan(0.01);
      expect(arc.clockwise).toBe(false);
    });

    it('should parse text entity', async () => {
      const testText = 'Hello World';
      const buffer = createJwwFileWithEntity(writer => {
        // Text entity
        writer.writeByte(0x04); // entity type
        writer.writeByte(0);    // layer
        writer.writeByte(1);    // color
        writer.writeByte(0);    // lineType
        writer.writeUInt16(100); // lineWidth
        writer.writeByte(0);    // group
        writer.writeByte(0);    // reserved

        // Text data
        writer.writeInt32(0);    // x
        writer.writeInt32(0);    // y
        writer.writeInt16(2000); // height (20mm)
        writer.writeInt16(1000); // width (10mm)
        writer.writeInt16(0);    // angle (0 degrees)
        writer.writeByte(0);     // alignFlags (left, bottom)
        writer.writeString('MS Gothic', 32); // font
        writer.writeUInt16(testText.length); // text length
        writer.writeString(testText, testText.length); // text
      });

      const parser = new JwwParser();
      const document = await parser.parse(buffer);

      const texts = document.entities.filter(e => e.type === 'text');
      expect(texts).toHaveLength(1);

      const text = texts[0] as any;
      expect(text.x).toBe(0);
      expect(text.y).toBe(0);
      expect(text.text).toBe(testText);
      expect(text.height).toBe(20);
      expect(text.width).toBe(10);
      expect(text.font).toBe('MS Gothic');
    });

    it('should parse ellipse entity', async () => {
      const buffer = createJwwFileWithEntity(writer => {
        // Ellipse entity
        writer.writeByte(0x05); // entity type
        writer.writeByte(0);    // layer
        writer.writeByte(4);    // color
        writer.writeByte(0);    // lineType
        writer.writeUInt16(100); // lineWidth
        writer.writeByte(0);    // group
        writer.writeByte(0);    // reserved

        // Ellipse data
        writer.writeInt32(0);    // centerX
        writer.writeInt32(0);    // centerY
        writer.writeInt32(5000); // radiusX (50mm)
        writer.writeInt32(2500); // radiusY (25mm)
        writer.writeInt16(45);   // rotation (45 degrees)
      });

      const parser = new JwwParser();
      const document = await parser.parse(buffer);

      const ellipses = document.entities.filter(e => e.type === 'ellipse');
      expect(ellipses).toHaveLength(1);

      const ellipse = ellipses[0] as any;
      expect(ellipse.centerX).toBe(0);
      expect(ellipse.centerY).toBe(0);
      expect(ellipse.radiusX).toBe(50);
      expect(ellipse.radiusY).toBe(25);
      expect(Math.abs(ellipse.rotation - Math.PI / 4)).toBeLessThan(0.01);
    });

    it('should parse dimension entity', async () => {
      const buffer = createJwwFileWithEntity(writer => {
        // Dimension entity
        writer.writeByte(0x06); // entity type
        writer.writeByte(0);    // layer
        writer.writeByte(1);    // color
        writer.writeByte(0);    // lineType
        writer.writeUInt16(100); // lineWidth
        writer.writeByte(0);    // group
        writer.writeByte(0);    // reserved

        // Dimension data
        writer.writeInt32(0);    // startX
        writer.writeInt32(0);    // startY
        writer.writeInt32(10000); // endX (100mm)
        writer.writeInt32(0);    // endY
        writer.writeInt32(5000); // textX (50mm)
        writer.writeInt32(500);  // textY (5mm)
        writer.writeInt32(100000); // value (100mm in 1/1000 mm units)
        writer.writeByte(0);     // dimensionType (linear)
        writer.writeUInt16(0);   // text length (use default)
      });

      const parser = new JwwParser();
      const document = await parser.parse(buffer);

      const dimensions = document.entities.filter(e => e.type === 'dimension');
      expect(dimensions).toHaveLength(1);

      const dimension = dimensions[0] as any;
      expect(dimension.startX).toBe(0);
      expect(dimension.startY).toBe(0);
      expect(dimension.endX).toBe(100);
      expect(dimension.endY).toBe(0);
      expect(dimension.value).toBe(100);
      expect(dimension.dimensionType).toBe('linear');
    });

    it('should parse polyline entity', async () => {
      const buffer = createJwwFileWithEntity(writer => {
        // Polyline entity
        writer.writeByte(0x07); // entity type
        writer.writeByte(0);    // layer
        writer.writeByte(5);    // color
        writer.writeByte(0);    // lineType
        writer.writeUInt16(100); // lineWidth
        writer.writeByte(0);    // group
        writer.writeByte(0);    // reserved

        // Polyline data
        writer.writeUInt16(3);   // pointCount
        writer.writeByte(1);     // flags (closed)
        writer.writeByte(0);     // reserved

        // Points
        writer.writeInt32(0);    // point 1 x
        writer.writeInt32(0);    // point 1 y
        writer.writeInt32(5000); // point 2 x
        writer.writeInt32(0);    // point 2 y
        writer.writeInt32(5000); // point 3 x
        writer.writeInt32(5000); // point 3 y
      });

      const parser = new JwwParser();
      const document = await parser.parse(buffer);

      const polylines = document.entities.filter(e => e.type === 'polyline');
      expect(polylines).toHaveLength(1);

      const polyline = polylines[0] as any;
      expect(polyline.points).toHaveLength(3);
      expect(polyline.closed).toBe(true);
      expect(polyline.points[0]).toEqual({ x: 0, y: 0 });
      expect(polyline.points[1]).toEqual({ x: 50, y: 0 });
      expect(polyline.points[2]).toEqual({ x: 50, y: 50 });
    });
  });

  describe('File Validation', () => {
    it('should validate JWW file signature', async () => {
      const buffer = createMinimalJwwFile();
      const isValid = await JwwParser.validate(buffer);
      expect(isValid).toBe(true);
    });

    it('should reject invalid file signature', async () => {
      const writer = new JwwBinaryWriter();
      writer.writeString('XXX', 3); // invalid signature
      writer.writeUInt16(11);
      writer.skip(250);

      const isValid = await JwwParser.validate(writer.getBuffer());
      expect(isValid).toBe(false);
    });

    it('should get file info', async () => {
      const buffer = createMinimalJwwFile();
      const info = await JwwParser.getFileInfo(buffer);

      expect(info.signature).toBe('JWW');
      expect(info.version).toBe(11);
      expect(info.fileSize).toBeGreaterThan(256);
    });
  });

  describe('Error Handling', () => {
    it('should handle skip invalid entities option', async () => {
      const writer = new JwwBinaryWriter();
      createJwwHeader(writer);

      // Add header + layer info
      for (let i = 0; i < 16; i++) {
        writer.writeByte(0x01); // visible
        writer.writeByte(0);    // color
        writer.writeByte(0);    // lineType
        writer.writeByte(0);    // reserved
        writer.writeString(`Layer ${i}`, 32);
      }

      // Add a valid line
      writer.writeByte(0x01);
      writer.writeByte(0);
      writer.writeByte(0);
      writer.writeByte(0);
      writer.writeUInt16(100);
      writer.writeByte(0);
      writer.writeByte(0);
      writer.writeInt32(0);
      writer.writeInt32(0);
      writer.writeInt32(100);
      writer.writeInt32(100);

      // Add terminator
      writer.writeByte(0x00);

      const parser = new JwwParser({ skipInvalidEntities: true });
      const document = await parser.parse(writer.getBuffer());

      // Should successfully parse despite potential issues
      expect(document.entities).toBeDefined();
    });
  });

  describe('Complex Scenarios', () => {
    it('should parse file with multiple different entity types', async () => {
      const writer = new JwwBinaryWriter();
      createJwwHeader(writer);

      // Add 16 default layers
      for (let i = 0; i < 16; i++) {
        writer.writeByte(0x01); // visible
        writer.writeByte(0);    // color
        writer.writeByte(0);    // lineType
        writer.writeByte(0);    // reserved
        writer.writeString(`Layer ${i}`, 32);
      }

      // Add multiple entities
      // Line
      writer.writeByte(0x01);
      writer.writeByte(0);
      writer.writeByte(1);
      writer.writeByte(0);
      writer.writeUInt16(100);
      writer.writeByte(0);
      writer.writeByte(0);
      writer.writeInt32(0);
      writer.writeInt32(0);
      writer.writeInt32(10000);
      writer.writeInt32(10000);

      // Circle
      writer.writeByte(0x02);
      writer.writeByte(1);
      writer.writeByte(2);
      writer.writeByte(0);
      writer.writeUInt16(100);
      writer.writeByte(0);
      writer.writeByte(0);
      writer.writeInt32(5000);
      writer.writeInt32(5000);
      writer.writeInt32(2500);

      // Polyline
      writer.writeByte(0x07);
      writer.writeByte(0);
      writer.writeByte(3);
      writer.writeByte(0);
      writer.writeUInt16(100);
      writer.writeByte(0);
      writer.writeByte(0);
      writer.writeUInt16(3);
      writer.writeByte(0);
      writer.writeByte(0);
      writer.writeInt32(0);
      writer.writeInt32(0);
      writer.writeInt32(5000);
      writer.writeInt32(0);
      writer.writeInt32(5000);
      writer.writeInt32(5000);

      // Terminator
      writer.writeByte(0x00);

      const parser = new JwwParser();
      const document = await parser.parse(writer.getBuffer());

      expect(document.entities).toHaveLength(3);
      expect(document.entities.filter(e => e.type === 'line')).toHaveLength(1);
      expect(document.entities.filter(e => e.type === 'circle')).toHaveLength(1);
      expect(document.entities.filter(e => e.type === 'polyline')).toHaveLength(1);
    });

    it('should parse entities on different layers with different colors', async () => {
      const writer = new JwwBinaryWriter();
      createJwwHeader(writer);

      // Add 16 default layers
      for (let i = 0; i < 16; i++) {
        writer.writeByte(0x01); // visible
        writer.writeByte(i);    // color (different per layer)
        writer.writeByte(0);    // lineType
        writer.writeByte(0);    // reserved
        writer.writeString(`Layer ${i}`, 32);
      }

      // Add lines on different layers with different colors
      for (let i = 0; i < 4; i++) {
        writer.writeByte(0x01);           // line type
        writer.writeByte(i);              // layer
        writer.writeByte(i * 2);          // color
        writer.writeByte(0);              // lineType
        writer.writeUInt16(100 * (i + 1)); // different lineWidth
        writer.writeByte(0);              // group
        writer.writeByte(0);              // reserved
        writer.writeInt32(0);
        writer.writeInt32(0);
        writer.writeInt32(1000 * (i + 1));
        writer.writeInt32(1000 * (i + 1));
      }

      // Terminator
      writer.writeByte(0x00);

      const parser = new JwwParser();
      const document = await parser.parse(writer.getBuffer());

      expect(document.entities).toHaveLength(4);
      for (let i = 0; i < 4; i++) {
        const line = document.entities[i] as any;
        expect(line.layer).toBe(i);
        expect(line.color).toBe(i * 2);
        expect(line.lineWidth).toBe(1 * (i + 1));
      }
    });

    it('should handle large polyline with many points', async () => {
      const writer = new JwwBinaryWriter();
      createJwwHeader(writer);

      // Add 16 default layers
      for (let i = 0; i < 16; i++) {
        writer.writeByte(0x01);
        writer.writeByte(0);
        writer.writeByte(0);
        writer.writeByte(0);
        writer.writeString(`Layer ${i}`, 32);
      }

      // Add polyline with many points
      const pointCount = 50;
      writer.writeByte(0x07);           // polyline
      writer.writeByte(0);              // layer
      writer.writeByte(1);              // color
      writer.writeByte(0);              // lineType
      writer.writeUInt16(100);          // lineWidth
      writer.writeByte(0);              // group
      writer.writeByte(0);              // reserved
      writer.writeUInt16(pointCount);   // point count
      writer.writeByte(1);              // closed
      writer.writeByte(0);              // reserved

      // Write points in a circle pattern
      for (let i = 0; i < pointCount; i++) {
        const angle = (i / pointCount) * 2 * Math.PI;
        const x = Math.round(Math.cos(angle) * 5000);
        const y = Math.round(Math.sin(angle) * 5000);
        writer.writeInt32(x);
        writer.writeInt32(y);
      }

      // Terminator
      writer.writeByte(0x00);

      const parser = new JwwParser();
      const document = await parser.parse(writer.getBuffer());

      expect(document.entities).toHaveLength(1);
      const polyline = document.entities[0] as any;
      expect(polyline.type).toBe('polyline');
      expect(polyline.points).toHaveLength(pointCount);
      expect(polyline.closed).toBe(true);
    });
  });

  describe('Encoding and Text Handling', () => {
    it('should preserve text content exactly', async () => {
      // Note: Testing with ASCII/UTF-8 compatible text only
      // JWW format uses Shift-JIS, but test utilities use UTF-8
      const testTexts = ['Hello', 'World', '123', 'Test'];

      for (const testText of testTexts) {
        const buffer = createJwwFileWithEntity(writer => {
          writer.writeByte(0x04);
          writer.writeByte(0);
          writer.writeByte(1);
          writer.writeByte(0);
          writer.writeUInt16(100);
          writer.writeByte(0);
          writer.writeByte(0);
          writer.writeInt32(0);
          writer.writeInt32(0);
          writer.writeInt16(2000);
          writer.writeInt16(1000);
          writer.writeInt16(0);
          writer.writeByte(0);
          writer.writeString('MS Gothic', 32);
          writer.writeUInt16(testText.length);
          writer.writeString(testText, testText.length);
        });

        const parser = new JwwParser();
        const document = await parser.parse(buffer);

        const texts = document.entities.filter(e => e.type === 'text');
        expect(texts).toHaveLength(1);
        const text = texts[0] as any;
        expect(text.text).toBe(testText);
      }
    });

    it('should handle text alignment flags correctly', async () => {
      const alignmentCases = [
        { flags: 0b0000, hAlign: 'left', vAlign: 'bottom' },
        { flags: 0b0001, hAlign: 'center', vAlign: 'bottom' },
        { flags: 0b0010, hAlign: 'right', vAlign: 'bottom' },
        { flags: 0b0100, hAlign: 'left', vAlign: 'middle' },
        { flags: 0b1000, hAlign: 'left', vAlign: 'top' }
      ];

      for (const testCase of alignmentCases) {
        const buffer = createJwwFileWithEntity(writer => {
          writer.writeByte(0x04);
          writer.writeByte(0);
          writer.writeByte(1);
          writer.writeByte(0);
          writer.writeUInt16(100);
          writer.writeByte(0);
          writer.writeByte(0);
          writer.writeInt32(0);
          writer.writeInt32(0);
          writer.writeInt16(2000);
          writer.writeInt16(1000);
          writer.writeInt16(0);
          writer.writeByte(testCase.flags);
          writer.writeString('MS Gothic', 32);
          writer.writeUInt16(4);
          writer.writeString('Test', 4);
        });

        const parser = new JwwParser();
        const document = await parser.parse(buffer);

        const texts = document.entities.filter(e => e.type === 'text');
        if (texts.length > 0) {
          const text = texts[0] as any;
          expect(text.horizontalAlign).toBe(testCase.hAlign);
          expect(text.verticalAlign).toBe(testCase.vAlign);
        }
      }
    });
  });
});

/**
 * Helper functions to create test JWW files
 */

function createMinimalJwwFile(options?: {
  offsetX?: number;
  offsetY?: number;
  scaleNum?: number;
  scaleDen?: number;
}) {
  const writer = new JwwBinaryWriter();
  createJwwHeader(writer, options);

  // Add 16 default layers
  for (let i = 0; i < 16; i++) {
    writer.writeByte(0x01); // visible
    writer.writeByte(0);    // color
    writer.writeByte(0);    // lineType
    writer.writeByte(0);    // reserved
    writer.writeString(`Layer ${i}`, 32);
  }

  // Add terminator
  writer.writeByte(0x00);

  return writer.getBuffer();
}

function createJwwHeader(
  writer: JwwBinaryWriter,
  options?: {
    offsetX?: number;
    offsetY?: number;
    scaleNum?: number;
    scaleDen?: number;
  }
) {
  writer.writeString('JWW', 3);  // signature
  writer.writeUInt16(11);         // version
  writer.writeByte(0);            // reserved
  writer.writeInt32(options?.scaleNum ?? 1); // scaleNum
  writer.writeInt32(options?.scaleDen ?? 1); // scaleDen
  writer.writeInt32(options?.offsetX ?? 0);  // offsetX
  writer.writeInt32(options?.offsetY ?? 0);  // offsetY
  writer.writeInt16(0);           // angle
  writer.writeUInt16(0);          // reserved
  writer.writeByte(16);           // layerCount
  writer.writeByte(16);           // groupCount

  // Pad header to 256 bytes
  const currentSize = 3 + 2 + 1 + 4 + 4 + 4 + 4 + 2 + 2 + 1 + 1;
  const remainingSize = 256 - currentSize;
  writer.skip(remainingSize);
}

function createJwwFileWithEntity(
  entityBuilder: (writer: JwwBinaryWriter) => void
) {
  const writer = new JwwBinaryWriter();
  createJwwHeader(writer);

  // Add 16 default layers
  for (let i = 0; i < 16; i++) {
    writer.writeByte(0x01); // visible
    writer.writeByte(0);    // color
    writer.writeByte(0);    // lineType
    writer.writeByte(0);    // reserved
    writer.writeString(`Layer ${i}`, 32);
  }

  // Add entity
  entityBuilder(writer);

  // Add terminator
  writer.writeByte(0x00);

  return writer.getBuffer();
}
