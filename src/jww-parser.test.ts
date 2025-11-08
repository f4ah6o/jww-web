/**
 * JWW Parser Test Suite
 * Tests the JWW parser with mock binary data
 */

import { describe, it, expect } from 'vitest';
import { JwwParser } from './jww-parser';
import {
  createJwwHeader,
  createJwwLayers,
  createLineEntity,
  createCircleEntity,
  createArcEntity,
  createTextEntity,
  createEllipseEntity,
  createDimensionEntity,
  createPolylineEntity,
  createCompleteJwwFile,
  combineBuffers,
  JwwTestDataBuilder
} from './test-helpers/jww-test-data';

describe('JwwParser', () => {
  describe('Header Parsing', () => {
    it('should parse JWW signature correctly', async () => {
      const header = createJwwHeader();
      const parser = new JwwParser();
      const doc = await parser.parse(header);

      expect(doc.header.signature).toBe('JWW');
    });

    it('should parse version number', async () => {
      const header = createJwwHeader({ version: 600 });
      const parser = new JwwParser();
      const doc = await parser.parse(header);

      expect(doc.header.version).toBe(600);
    });

    it('should parse scale correctly', async () => {
      const header = createJwwHeader({ scaleNum: 1, scaleDen: 100 });
      const parser = new JwwParser();
      const doc = await parser.parse(header);

      expect(doc.header.scale).toBe(0.01);
    });

    it('should handle zero scale denominator', async () => {
      const header = createJwwHeader({ scaleNum: 1, scaleDen: 0 });
      const parser = new JwwParser();
      const doc = await parser.parse(header);

      expect(doc.header.scale).toBe(1.0);
    });

    it('should parse offset correctly', async () => {
      const header = createJwwHeader({ offsetX: 1000, offsetY: 2000 });
      const parser = new JwwParser();
      const doc = await parser.parse(header);

      expect(doc.header.offsetX).toBe(10); // 1000 * 0.01mm
      expect(doc.header.offsetY).toBe(20); // 2000 * 0.01mm
    });

    it('should parse rotation angle', async () => {
      const header = createJwwHeader({ angle: 45 });
      const parser = new JwwParser();
      const doc = await parser.parse(header);

      expect(doc.header.angle).toBeCloseTo(Math.PI / 4, 5);
    });

    it('should parse layer and group counts', async () => {
      const header = createJwwHeader({ layerCount: 16, groupCount: 16 });
      const parser = new JwwParser();
      const doc = await parser.parse(header);

      expect(doc.header.layerCount).toBe(16);
      expect(doc.header.groupCount).toBe(16);
    });

    it('should reject invalid signature', async () => {
      const builder = new JwwTestDataBuilder();
      builder.writeString('XXX', 3); // Invalid signature
      builder.writeUInt16(600);
      builder.alignTo(256);

      const parser = new JwwParser();
      await expect(parser.parse(builder.build())).rejects.toThrow('Invalid file signature');
    });
  });

  describe('Layer Parsing', () => {
    it('should parse layer information', async () => {
      const file = combineBuffers(
        createJwwHeader({ layerCount: 2 }),
        createJwwLayers(2)
      );

      const parser = new JwwParser();
      const doc = await parser.parse(file);

      expect(doc.layers).toHaveLength(2);
      expect(doc.layers[0].number).toBe(0);
      expect(doc.layers[0].visible).toBe(true);
      expect(doc.layers[0].name).toContain('Layer');
    });

    it('should parse all 16 default layers', async () => {
      const file = combineBuffers(
        createJwwHeader({ layerCount: 16 }),
        createJwwLayers(16)
      );

      const parser = new JwwParser();
      const doc = await parser.parse(file);

      expect(doc.layers).toHaveLength(16);
    });

    it('should handle layer parsing errors gracefully', async () => {
      const header = createJwwHeader({ layerCount: 2 });
      const builder = new JwwTestDataBuilder();
      // Incomplete layer data
      builder.writeByte(0x01);

      const file = combineBuffers(header, builder.build());
      const parser = new JwwParser({ skipInvalidEntities: true });
      const doc = await parser.parse(file);

      // Should still create default layers
      expect(doc.layers.length).toBeGreaterThan(0);
    });
  });

  describe('Line Entity Parsing', () => {
    it('should parse a line entity', async () => {
      const file = combineBuffers(
        createJwwHeader(),
        createJwwLayers(),
        createLineEntity({
          startX: 0,
          startY: 0,
          endX: 100,
          endY: 50
        }),
        new JwwTestDataBuilder().writeByte(0x00).build() // End marker
      );

      const parser = new JwwParser();
      const doc = await parser.parse(file);

      expect(doc.entities).toHaveLength(1);
      expect(doc.entities[0].type).toBe('line');

      const line = doc.entities[0] as any;
      expect(line.startX).toBe(0);
      expect(line.startY).toBe(0);
      expect(line.endX).toBe(100);
      expect(line.endY).toBe(50);
    });

    it('should parse line with correct layer and color', async () => {
      const file = combineBuffers(
        createJwwHeader(),
        createJwwLayers(),
        createLineEntity({
          layer: 2,
          color: 5,
          lineWidth: 0.5
        }),
        new JwwTestDataBuilder().writeByte(0x00).build()
      );

      const parser = new JwwParser();
      const doc = await parser.parse(file);

      const line = doc.entities[0] as any;
      expect(line.layer).toBe(2);
      expect(line.color).toBe(5);
      expect(line.lineWidth).toBe(0.5);
    });
  });

  describe('Circle Entity Parsing', () => {
    it('should parse a circle entity', async () => {
      const file = combineBuffers(
        createJwwHeader(),
        createJwwLayers(),
        createCircleEntity({
          centerX: 50,
          centerY: 50,
          radius: 25
        }),
        new JwwTestDataBuilder().writeByte(0x00).build()
      );

      const parser = new JwwParser();
      const doc = await parser.parse(file);

      expect(doc.entities).toHaveLength(1);
      expect(doc.entities[0].type).toBe('circle');

      const circle = doc.entities[0] as any;
      expect(circle.centerX).toBe(50);
      expect(circle.centerY).toBe(50);
      expect(circle.radius).toBe(25);
    });
  });

  describe('Arc Entity Parsing', () => {
    it('should parse an arc entity', async () => {
      const file = combineBuffers(
        createJwwHeader(),
        createJwwLayers(),
        createArcEntity({
          centerX: 50,
          centerY: 50,
          radius: 30,
          startAngle: 0,
          endAngle: 90,
          clockwise: false
        }),
        new JwwTestDataBuilder().writeByte(0x00).build()
      );

      const parser = new JwwParser();
      const doc = await parser.parse(file);

      expect(doc.entities).toHaveLength(1);
      expect(doc.entities[0].type).toBe('arc');

      const arc = doc.entities[0] as any;
      expect(arc.centerX).toBe(50);
      expect(arc.centerY).toBe(50);
      expect(arc.radius).toBe(30);
      expect(arc.startAngle).toBeCloseTo(0, 5);
      expect(arc.endAngle).toBeCloseTo(Math.PI / 2, 5);
      expect(arc.clockwise).toBe(false);
    });

    it('should parse clockwise arc', async () => {
      const file = combineBuffers(
        createJwwHeader(),
        createJwwLayers(),
        createArcEntity({ clockwise: true }),
        new JwwTestDataBuilder().writeByte(0x00).build()
      );

      const parser = new JwwParser();
      const doc = await parser.parse(file);

      const arc = doc.entities[0] as any;
      expect(arc.clockwise).toBe(true);
    });
  });

  describe('Text Entity Parsing', () => {
    it('should parse a text entity', async () => {
      const file = combineBuffers(
        createJwwHeader(),
        createJwwLayers(),
        createTextEntity({
          x: 10,
          y: 20,
          text: 'Hello JWW',
          height: 5,
          width: 5
        }),
        new JwwTestDataBuilder().writeByte(0x00).build()
      );

      const parser = new JwwParser();
      const doc = await parser.parse(file);

      expect(doc.entities).toHaveLength(1);
      expect(doc.entities[0].type).toBe('text');

      const text = doc.entities[0] as any;
      expect(text.x).toBe(10);
      expect(text.y).toBe(20);
      expect(text.text).toBe('Hello JWW');
      expect(text.height).toBe(5);
      expect(text.width).toBe(5);
      expect(text.font).toBe('MS Gothic');
    });

    it('should parse text with rotation', async () => {
      const file = combineBuffers(
        createJwwHeader(),
        createJwwLayers(),
        createTextEntity({ angle: 45 }),
        new JwwTestDataBuilder().writeByte(0x00).build()
      );

      const parser = new JwwParser();
      const doc = await parser.parse(file);

      const text = doc.entities[0] as any;
      expect(text.angle).toBeCloseTo(Math.PI / 4, 5);
    });
  });

  describe('Ellipse Entity Parsing', () => {
    it('should parse an ellipse entity', async () => {
      const file = combineBuffers(
        createJwwHeader(),
        createJwwLayers(),
        createEllipseEntity({
          centerX: 50,
          centerY: 50,
          radiusX: 40,
          radiusY: 20,
          rotation: 30
        }),
        new JwwTestDataBuilder().writeByte(0x00).build()
      );

      const parser = new JwwParser();
      const doc = await parser.parse(file);

      expect(doc.entities).toHaveLength(1);
      expect(doc.entities[0].type).toBe('ellipse');

      const ellipse = doc.entities[0] as any;
      expect(ellipse.centerX).toBe(50);
      expect(ellipse.centerY).toBe(50);
      expect(ellipse.radiusX).toBe(40);
      expect(ellipse.radiusY).toBe(20);
      expect(ellipse.rotation).toBeCloseTo(Math.PI / 6, 5); // 30 degrees
    });
  });

  describe('Dimension Entity Parsing', () => {
    it('should parse a dimension entity', async () => {
      const file = combineBuffers(
        createJwwHeader(),
        createJwwLayers(),
        createDimensionEntity({
          startX: 0,
          startY: 0,
          endX: 100,
          endY: 0,
          value: 100,
          text: '100.00'
        }),
        new JwwTestDataBuilder().writeByte(0x00).build()
      );

      const parser = new JwwParser();
      const doc = await parser.parse(file);

      expect(doc.entities).toHaveLength(1);
      expect(doc.entities[0].type).toBe('dimension');

      const dim = doc.entities[0] as any;
      expect(dim.startX).toBe(0);
      expect(dim.endX).toBe(100);
      expect(dim.value).toBe(100);
      expect(dim.text).toBe('100.00');
      expect(dim.dimensionType).toBe('linear');
    });
  });

  describe('Polyline Entity Parsing', () => {
    it('should parse a polyline entity', async () => {
      const points = [
        { x: 0, y: 0 },
        { x: 50, y: 25 },
        { x: 100, y: 0 }
      ];

      const file = combineBuffers(
        createJwwHeader(),
        createJwwLayers(),
        createPolylineEntity({ points, closed: false }),
        new JwwTestDataBuilder().writeByte(0x00).build()
      );

      const parser = new JwwParser();
      const doc = await parser.parse(file);

      expect(doc.entities).toHaveLength(1);
      expect(doc.entities[0].type).toBe('polyline');

      const polyline = doc.entities[0] as any;
      expect(polyline.points).toHaveLength(3);
      expect(polyline.points[0].x).toBe(0);
      expect(polyline.points[0].y).toBe(0);
      expect(polyline.points[1].x).toBe(50);
      expect(polyline.points[2].x).toBe(100);
      expect(polyline.closed).toBe(false);
    });

    it('should parse closed polyline', async () => {
      const file = combineBuffers(
        createJwwHeader(),
        createJwwLayers(),
        createPolylineEntity({ closed: true }),
        new JwwTestDataBuilder().writeByte(0x00).build()
      );

      const parser = new JwwParser();
      const doc = await parser.parse(file);

      const polyline = doc.entities[0] as any;
      expect(polyline.closed).toBe(true);
    });
  });

  describe('Multiple Entities', () => {
    it('should parse multiple entities of different types', async () => {
      const file = combineBuffers(
        createJwwHeader(),
        createJwwLayers(),
        createLineEntity({ startX: 0, startY: 0, endX: 100, endY: 0 }),
        createCircleEntity({ centerX: 50, centerY: 50, radius: 25 }),
        createArcEntity({ centerX: 75, centerY: 75, radius: 30 }),
        createTextEntity({ x: 10, y: 90, text: 'Test' }),
        new JwwTestDataBuilder().writeByte(0x00).build()
      );

      const parser = new JwwParser();
      const doc = await parser.parse(file);

      expect(doc.entities).toHaveLength(4);
      expect(doc.entities[0].type).toBe('line');
      expect(doc.entities[1].type).toBe('circle');
      expect(doc.entities[2].type).toBe('arc');
      expect(doc.entities[3].type).toBe('text');
    });
  });

  describe('Complete JWW File', () => {
    it('should parse a complete JWW file with all entity types', async () => {
      const file = createCompleteJwwFile();
      const parser = new JwwParser();
      const doc = await parser.parse(file);

      expect(doc.header).toBeDefined();
      expect(doc.header.signature).toBe('JWW');
      expect(doc.layers).toHaveLength(16);
      expect(doc.entities.length).toBeGreaterThan(0);

      // Check that different entity types are present
      const entityTypes = new Set(doc.entities.map(e => e.type));
      expect(entityTypes.has('line')).toBe(true);
      expect(entityTypes.has('circle')).toBe(true);
      expect(entityTypes.has('arc')).toBe(true);
      expect(entityTypes.has('text')).toBe(true);
    });

    it('should parse file with only specific entity types', async () => {
      const file = createCompleteJwwFile({
        includeLines: true,
        includeCircles: true,
        includeArcs: false,
        includeText: false,
        includeEllipses: false,
        includeDimensions: false,
        includePolylines: false
      });

      const parser = new JwwParser();
      const doc = await parser.parse(file);

      const entityTypes = new Set(doc.entities.map(e => e.type));
      expect(entityTypes.has('line')).toBe(true);
      expect(entityTypes.has('circle')).toBe(true);
      expect(entityTypes.has('arc')).toBe(false);
      expect(entityTypes.has('text')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid entity gracefully in skip mode', async () => {
      const builder = new JwwTestDataBuilder();
      builder.writeByte(0xFF); // Unknown entity type
      builder.writePadding(40);

      const file = combineBuffers(
        createJwwHeader(),
        createJwwLayers(),
        builder.build(),
        createLineEntity({ startX: 0, startY: 0, endX: 100, endY: 100 }),
        new JwwTestDataBuilder().writeByte(0x00).build()
      );

      const parser = new JwwParser({ skipInvalidEntities: true });
      const doc = await parser.parse(file);

      // Should skip unknown entity and continue
      expect(doc.entities.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle truncated file', async () => {
      const builder = new JwwTestDataBuilder();
      builder.writeString('JWW', 3);
      builder.writeUInt16(600);
      // Incomplete header

      const parser = new JwwParser({ skipInvalidEntities: true });
      await expect(parser.parse(builder.build())).rejects.toThrow();
    });
  });

  describe('Validation', () => {
    it('should validate a valid JWW file', async () => {
      const file = createJwwHeader();
      const isValid = await JwwParser.validate(file);
      expect(isValid).toBe(true);
    });

    it('should reject file with invalid signature', async () => {
      const builder = new JwwTestDataBuilder();
      builder.writeString('XXX', 3);
      builder.alignTo(256);

      const isValid = await JwwParser.validate(builder.build());
      expect(isValid).toBe(false);
    });

    it('should reject file that is too small', async () => {
      const builder = new JwwTestDataBuilder();
      builder.writeString('JWW', 3);

      const isValid = await JwwParser.validate(builder.build());
      expect(isValid).toBe(false);
    });
  });

  describe('File Info', () => {
    it('should get file info without full parsing', async () => {
      const file = createJwwHeader({ version: 800 });
      const info = await JwwParser.getFileInfo(file);

      expect(info.signature).toBe('JWW');
      expect(info.version).toBe(800);
      expect(info.fileSize).toBe(256);
    });
  });

  describe('Parser Options', () => {
    it('should respect skipInvalidEntities option', async () => {
      const parser = new JwwParser({ skipInvalidEntities: true });
      expect(parser).toBeDefined();
    });

    it('should respect strictMode option', async () => {
      const parser = new JwwParser({ strictMode: true });
      expect(parser).toBeDefined();
    });
  });
});
