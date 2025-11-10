/**
 * JWW File Parser
 * Based on JwwExchange implementation and JWW format specifications
 */

import { JwwBinaryReader, JwwCoordinateConverter } from './binary-reader';
import type {
  JwwDocument,
  JwwHeader,
  JwwLayer,
  JwwEntity,
  JwwLine,
  JwwCircle,
  JwwArc,
  JwwText,
  JwwEllipse,
  JwwDimension,
  JwwPolyline,
  JwwParserOptions
} from './types';

// JWWファイルのマジックナンバー
const JWW_SIGNATURE = 'JWW';
const JWS_SIGNATURE = 'JWS';
const JWWDATA_SIGNATURE = 'JwwData'; // 新しいフォーマット

export class JwwParser {
  private options: Required<JwwParserOptions>;

  constructor(options: JwwParserOptions = {}) {
    this.options = {
      encoding: options.encoding ?? 'shift-jis',
      strictMode: options.strictMode ?? false,
      skipInvalidEntities: options.skipInvalidEntities ?? true
    };
  }

  /**
   * JWWファイルをパース
   */
  async parse(file: File | ArrayBuffer): Promise<JwwDocument> {
    const buffer = file instanceof File ? await file.arrayBuffer() : file;
    const reader = new JwwBinaryReader(buffer);

    try {
      // ヘッダー解析
      const header = this.parseHeader(reader);
      
      // レイヤー情報解析
      const layers = this.parseLayers(reader, header);
      
      // エンティティ解析
      const entities = this.parseEntities(reader, header);

      return {
        header,
        layers,
        entities
      };
    } catch (error) {
      if (this.options.strictMode) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('JWW parsing error:', error);
      throw new Error(`Failed to parse JWW file: ${errorMessage}`);
    }
  }

  /**
   * ヘッダー情報を解析
   * JWWファイルの先頭部分には基本情報が格納されている
   */
  private parseHeader(reader: JwwBinaryReader): JwwHeader {
    // シグネチャ確認
    // まず3バイト読んで、JWWData形式かチェック
    const sig3 = reader.readString(3);
    let signature = sig3;

    if (sig3 === 'Jww') {
      // JwwData形式の可能性があるので、さらに4バイト読む
      const sig4 = reader.readString(4);
      if (sig4 === 'Data') {
        signature = 'Jww'; // JWW互換として扱う
        // 残りのヘッダーをスキップ (JwwData. の後のバイト)
        reader.skip(1); // '.' をスキップ
      } else {
        // 期待したシグネチャではない
        throw new Error(`Invalid file signature: ${sig3}${sig4}`);
      }
    } else if (signature !== JWW_SIGNATURE && signature !== JWS_SIGNATURE) {
      throw new Error(`Invalid file signature: ${signature}`);
    }

    // バージョン情報
    // JWWファイル形式のバージョンを取得
    const version = reader.readUInt16();
    
    // ファイル情報ブロック
    // JwwExchangeのCDataMoji構造を参考
    reader.skip(1); // 予約バイト

    // スケール情報
    const scaleNum = reader.readInt32();
    const scaleDen = reader.readInt32();
    const scale = scaleDen !== 0 ? scaleNum / scaleDen : 1.0;

    // 原点オフセット
    const offsetX = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const offsetY = JwwCoordinateConverter.toMillimeters(reader.readInt32());

    // 回転角度
    const angle = JwwCoordinateConverter.toRadians(reader.readInt16());

    // レイヤー・グループ情報
    reader.skip(2); // 予約
    const layerCount = reader.readByte();
    const groupCount = reader.readByte();

    // 残りのヘッダー情報をスキップ
    // 実際のJWWファイルフォーマットに応じて調整が必要
    reader.align(256); // ヘッダーは通常256バイト境界

    return {
      signature,
      version,
      scale,
      offsetX,
      offsetY,
      angle,
      layerCount: layerCount || 16, // デフォルト16レイヤー
      groupCount: groupCount || 16
    };
  }

  /**
   * レイヤー情報を解析
   */
  private parseLayers(reader: JwwBinaryReader, header: JwwHeader): JwwLayer[] {
    const layers: JwwLayer[] = [];

    for (let i = 0; i < header.layerCount; i++) {
      try {
        // レイヤー情報ブロック
        const flags = reader.readByte();
        const visible = (flags & 0x01) !== 0;
        const locked = (flags & 0x02) !== 0;

        const color = reader.readByte();
        const lineType = reader.readByte();
        reader.skip(1); // 予約

        // レイヤー名 (最大32文字)
        const name = reader.readString(32).trim();

        layers.push({
          number: i,
          name: name || `Layer ${i}`,
          visible,
          locked,
          color,
          lineType
        });
      } catch (error) {
        console.warn(`Failed to parse layer ${i}:`, error);
        // デフォルトレイヤーを追加
        layers.push({
          number: i,
          name: `Layer ${i}`,
          visible: true,
          locked: false,
          color: 0,
          lineType: 0
        });
      }
    }

    return layers;
  }

  /**
   * エンティティを解析
   * JWWファイルの主要な図形データを読み込む
   */
  private parseEntities(reader: JwwBinaryReader, _header: JwwHeader): JwwEntity[] {
    const entities: JwwEntity[] = [];

    while (!reader.isEOF() && reader.remaining() > 4) {
      try {
        const entity = this.parseEntity(reader);
        if (entity) {
          entities.push(entity);
        }
      } catch (error) {
        if (this.options.skipInvalidEntities) {
          console.warn('Skipping invalid entity:', error);
          // 次のエンティティまでスキップ
          reader.skip(Math.min(64, reader.remaining()));
        } else {
          throw error;
        }
      }
    }

    return entities;
  }

  /**
   * 個別のエンティティを解析
   * エンティティタイプに応じて適切な解析メソッドを呼び出す
   */
  private parseEntity(reader: JwwBinaryReader): JwwEntity | null {
    // エンティティヘッダー
    const entityType = reader.readByte();
    const layer = reader.readByte();
    const color = reader.readByte();
    const lineType = reader.readByte();
    const lineWidth = reader.readUInt16();
    const group = reader.readByte();
    reader.skip(1); // 予約

    // 共通プロパティ
    const baseProps = {
      layer,
      color,
      lineType,
      lineWidth: lineWidth / 100.0, // 0.01mm単位から変換
      group
    };

    // エンティティタイプ別の解析
    // JwwExchangeのCDataSen, CDataCircle等を参考
    switch (entityType) {
      case 0x00: // 終端マーカー
        return null;

      case 0x01: // 線分 (Line)
        return this.parseLine(reader, baseProps);

      case 0x02: // 円 (Circle)
        return this.parseCircle(reader, baseProps);

      case 0x03: // 円弧 (Arc)
        return this.parseArc(reader, baseProps);

      case 0x04: // テキスト (Text)
        return this.parseText(reader, baseProps);

      case 0x05: // 楕円 (Ellipse)
        return this.parseEllipse(reader, baseProps);

      case 0x06: // 寸法線 (Dimension)
        return this.parseDimension(reader, baseProps);

      case 0x07: // ポリライン (Polyline)
        return this.parsePolyline(reader, baseProps);

      // その他のエンティティタイプ
      // case 0x08: // Point
      // case 0x09: // Solid
      // ...

      default:
        console.warn(`Unknown entity type: 0x${entityType.toString(16)}`);
        // 不明なエンティティをスキップ
        reader.skip(32); // 適当なサイズをスキップ
        return null;
    }
  }

  /**
   * 線分エンティティを解析
   */
  private parseLine(reader: JwwBinaryReader, baseProps: any): JwwLine {
    const startX = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const startY = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const endX = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const endY = JwwCoordinateConverter.toMillimeters(reader.readInt32());

    return {
      ...baseProps,
      type: 'line',
      startX,
      startY,
      endX,
      endY
    };
  }

  /**
   * 円エンティティを解析
   */
  private parseCircle(reader: JwwBinaryReader, baseProps: any): JwwCircle {
    const centerX = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const centerY = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const radius = JwwCoordinateConverter.toMillimeters(reader.readInt32());

    return {
      ...baseProps,
      type: 'circle',
      centerX,
      centerY,
      radius
    };
  }

  /**
   * 円弧エンティティを解析
   */
  private parseArc(reader: JwwBinaryReader, baseProps: any): JwwArc {
    const centerX = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const centerY = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const radius = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    
    const startAngle = JwwCoordinateConverter.toRadians(reader.readInt16());
    const endAngle = JwwCoordinateConverter.toRadians(reader.readInt16());
    
    const flags = reader.readByte();
    const clockwise = (flags & 0x01) !== 0;

    return {
      ...baseProps,
      type: 'arc',
      centerX,
      centerY,
      radius,
      startAngle,
      endAngle,
      clockwise
    };
  }

  /**
   * テキストエンティティを解析
   */
  private parseText(reader: JwwBinaryReader, baseProps: any): JwwText {
    const x = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const y = JwwCoordinateConverter.toMillimeters(reader.readInt32());

    const height = JwwCoordinateConverter.toMillimeters(reader.readInt16());
    const width = JwwCoordinateConverter.toMillimeters(reader.readInt16());
    const angle = JwwCoordinateConverter.toRadians(reader.readInt16());

    // アライメントフラグ
    const alignFlags = reader.readByte();
    const horizontalAlign = ['left', 'center', 'right'][alignFlags & 0x03] as 'left' | 'center' | 'right';
    const verticalAlign = ['bottom', 'middle', 'top'][(alignFlags >> 2) & 0x03] as 'bottom' | 'middle' | 'top';

    // フォント名
    const font = reader.readString(32).trim();

    // テキスト内容 (最大256文字)
    const textLength = reader.readUInt16();
    const text = reader.readString(textLength);

    return {
      ...baseProps,
      type: 'text',
      x,
      y,
      text,
      height,
      width,
      angle,
      font: font || 'MS Gothic',
      horizontalAlign,
      verticalAlign
    };
  }

  /**
   * 楕円エンティティを解析
   */
  private parseEllipse(reader: JwwBinaryReader, baseProps: any): JwwEllipse {
    const centerX = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const centerY = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const radiusX = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const radiusY = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const rotation = JwwCoordinateConverter.toRadians(reader.readInt16());

    return {
      ...baseProps,
      type: 'ellipse',
      centerX,
      centerY,
      radiusX,
      radiusY,
      rotation
    };
  }

  /**
   * 寸法線エンティティを解析
   */
  private parseDimension(reader: JwwBinaryReader, baseProps: any): JwwDimension {
    const startX = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const startY = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const endX = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const endY = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const textX = JwwCoordinateConverter.toMillimeters(reader.readInt32());
    const textY = JwwCoordinateConverter.toMillimeters(reader.readInt32());

    const value = reader.readInt32() / 1000.0; // 値はミリメートル単位

    // 寸法タイプ
    const dimType = reader.readByte();
    const dimensionTypes = ['linear', 'aligned', 'angular', 'radius', 'diameter'] as const;
    const dimensionType = dimensionTypes[dimType] || 'linear';

    // 寸法テキスト
    const textLength = reader.readUInt16();
    const text = textLength > 0 ? reader.readString(textLength) : value.toFixed(2);

    return {
      ...baseProps,
      type: 'dimension',
      startX,
      startY,
      endX,
      endY,
      textX,
      textY,
      value,
      text,
      dimensionType
    };
  }

  /**
   * ポリラインエンティティを解析
   */
  private parsePolyline(reader: JwwBinaryReader, baseProps: any): JwwPolyline {
    const pointCount = reader.readUInt16();
    const flags = reader.readByte();
    const closed = (flags & 0x01) !== 0;

    reader.skip(1); // 予約

    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < pointCount; i++) {
      const x = JwwCoordinateConverter.toMillimeters(reader.readInt32());
      const y = JwwCoordinateConverter.toMillimeters(reader.readInt32());
      points.push({ x, y });
    }

    return {
      ...baseProps,
      type: 'polyline',
      points,
      closed
    };
  }

  /**
   * ファイルが有効なJWWファイルかチェック
   */
  static async validate(file: File | ArrayBuffer): Promise<boolean> {
    try {
      const buffer = file instanceof File ? await file.arrayBuffer() : file;
      if (buffer.byteLength < 8) {
        return false;
      }

      const reader = new JwwBinaryReader(buffer);
      const sig3 = reader.readString(3);

      // 標準フォーマット (JWW/JWS)
      if (sig3 === JWW_SIGNATURE || sig3 === JWS_SIGNATURE) {
        return true;
      }

      // JwwData形式
      if (sig3 === 'Jww') {
        const sig4 = reader.readString(4);
        if (sig4 === 'Data') {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * ファイル情報を取得(パースせずに基本情報のみ)
   */
  static async getFileInfo(file: File | ArrayBuffer): Promise<{
    signature: string;
    version: number;
    fileSize: number;
  }> {
    const buffer = file instanceof File ? await file.arrayBuffer() : file;
    const reader = new JwwBinaryReader(buffer);

    const signature = reader.readString(3);
    const version = reader.readUInt16();

    return {
      signature,
      version,
      fileSize: buffer.byteLength
    };
  }
}

/**
 * パース進捗イベント用のインターフェース
 */
export interface ParseProgress {
  stage: 'header' | 'layers' | 'entities';
  current: number;
  total: number;
  percentage: number;
}

/**
 * 非同期パーサー(大きなファイル用)
 * Web Workerでの使用を想定
 */
export class JwwAsyncParser extends JwwParser {
  private progressCallback?: (progress: ParseProgress) => void;

  constructor(
    options: JwwParserOptions = {},
    progressCallback?: (progress: ParseProgress) => void
  ) {
    super(options);
    this.progressCallback = progressCallback;
  }

  protected emitProgress(stage: ParseProgress['stage'], current: number, total: number) {
    if (this.progressCallback) {
      this.progressCallback({
        stage,
        current,
        total,
        percentage: total > 0 ? (current / total) * 100 : 0
      });
    }
  }
}
