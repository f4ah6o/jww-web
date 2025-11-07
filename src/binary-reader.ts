/**
 * Binary Reader for JWW Files
 * Handles little-endian binary data and Shift-JIS text encoding
 */

export class JwwBinaryReader {
  private view: DataView;
  private offset: number = 0;
  private decoder: TextDecoder;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
    // Shift-JISデコーダー (ブラウザネイティブまたはpolyfillを使用)
    try {
      this.decoder = new TextDecoder('shift-jis');
    } catch {
      // フォールバック: UTF-8
      console.warn('Shift-JIS not supported, using UTF-8');
      this.decoder = new TextDecoder('utf-8');
    }
  }

  /**
   * 現在のオフセット位置を取得
   */
  getOffset(): number {
    return this.offset;
  }

  /**
   * オフセット位置を設定
   */
  setOffset(offset: number): void {
    if (offset < 0 || offset > this.view.byteLength) {
      throw new Error(`Invalid offset: ${offset}`);
    }
    this.offset = offset;
  }

  /**
   * バッファの残りサイズを取得
   */
  remaining(): number {
    return this.view.byteLength - this.offset;
  }

  /**
   * ファイル終端に達したか
   */
  isEOF(): boolean {
    return this.offset >= this.view.byteLength;
  }

  /**
   * 1バイト読み込み (unsigned)
   */
  readByte(): number {
    if (this.offset >= this.view.byteLength) {
      throw new Error('Unexpected end of file');
    }
    return this.view.getUint8(this.offset++);
  }

  /**
   * 1バイト読み込み (signed)
   */
  readSByte(): number {
    if (this.offset >= this.view.byteLength) {
      throw new Error('Unexpected end of file');
    }
    return this.view.getInt8(this.offset++);
  }

  /**
   * 2バイト整数読み込み (unsigned, little-endian)
   */
  readUInt16(): number {
    if (this.offset + 2 > this.view.byteLength) {
      throw new Error('Unexpected end of file');
    }
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  /**
   * 2バイト整数読み込み (signed, little-endian)
   */
  readInt16(): number {
    if (this.offset + 2 > this.view.byteLength) {
      throw new Error('Unexpected end of file');
    }
    const value = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return value;
  }

  /**
   * 4バイト整数読み込み (unsigned, little-endian)
   */
  readUInt32(): number {
    if (this.offset + 4 > this.view.byteLength) {
      throw new Error('Unexpected end of file');
    }
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * 4バイト整数読み込み (signed, little-endian)
   */
  readInt32(): number {
    if (this.offset + 4 > this.view.byteLength) {
      throw new Error('Unexpected end of file');
    }
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * 4バイト浮動小数点読み込み (little-endian)
   */
  readFloat(): number {
    if (this.offset + 4 > this.view.byteLength) {
      throw new Error('Unexpected end of file');
    }
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * 8バイト浮動小数点読み込み (little-endian)
   */
  readDouble(): number {
    if (this.offset + 8 > this.view.byteLength) {
      throw new Error('Unexpected end of file');
    }
    const value = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }

  /**
   * 固定長文字列読み込み (Shift-JIS)
   */
  readString(length: number): string {
    if (this.offset + length > this.view.byteLength) {
      throw new Error('Unexpected end of file');
    }

    const bytes = new Uint8Array(this.view.buffer, this.offset, length);
    this.offset += length;

    // NULL終端までを取得
    let actualLength = length;
    for (let i = 0; i < length; i++) {
      if (bytes[i] === 0) {
        actualLength = i;
        break;
      }
    }

    // デコード
    return this.decoder.decode(bytes.slice(0, actualLength));
  }

  /**
   * NULL終端文字列読み込み
   */
  readCString(maxLength: number = 256): string {
    const startOffset = this.offset;
    let length = 0;

    // NULL終端を探す
    while (length < maxLength && this.offset < this.view.byteLength) {
      if (this.view.getUint8(this.offset) === 0) {
        break;
      }
      this.offset++;
      length++;
    }

    const bytes = new Uint8Array(this.view.buffer, startOffset, length);
    this.offset++; // NULL文字をスキップ

    return this.decoder.decode(bytes);
  }

  /**
   * バイト配列読み込み
   */
  readBytes(length: number): Uint8Array {
    if (this.offset + length > this.view.byteLength) {
      throw new Error('Unexpected end of file');
    }

    const bytes = new Uint8Array(this.view.buffer, this.offset, length);
    this.offset += length;
    return bytes;
  }

  /**
   * 指定バイト数をスキップ
   */
  skip(bytes: number): void {
    this.offset += bytes;
    if (this.offset > this.view.byteLength) {
      throw new Error('Unexpected end of file');
    }
  }

  /**
   * アライメント調整
   * 指定したバイト境界に揃える
   */
  align(boundary: number): void {
    const remainder = this.offset % boundary;
    if (remainder !== 0) {
      this.skip(boundary - remainder);
    }
  }

  /**
   * バッファの一部を新しいリーダーとして取得
   */
  slice(length: number): JwwBinaryReader {
    if (this.offset + length > this.view.byteLength) {
      throw new Error('Unexpected end of file');
    }

    const buffer = this.view.buffer.slice(this.offset, this.offset + length) as ArrayBuffer;
    this.offset += length;
    return new JwwBinaryReader(buffer);
  }

  /**
   * デバッグ用: 現在位置の16進ダンプ
   */
  hexDump(length: number = 16): string {
    const bytes = [];
    const startOffset = this.offset;
    const endOffset = Math.min(this.offset + length, this.view.byteLength);

    for (let i = startOffset; i < endOffset; i++) {
      const byte = this.view.getUint8(i);
      bytes.push(byte.toString(16).padStart(2, '0'));
    }

    return bytes.join(' ');
  }
}

/**
 * JWW座標系からスクリーン座標系への変換ヘルパー
 */
export class JwwCoordinateConverter {
  /**
   * JWW内部座標からmm単位への変換
   * JWWは内部で0.01mm単位を使用
   */
  static toMillimeters(internalValue: number): number {
    return internalValue / 100.0;
  }

  /**
   * mm単位からJWW内部座標への変換
   */
  static fromMillimeters(mmValue: number): number {
    return mmValue * 100.0;
  }

  /**
   * 角度変換: JWW内部形式からラジアンへ
   * JWWは内部で角度を特定の形式で保存
   */
  static toRadians(internalAngle: number): number {
    // JWWの角度形式に応じて実装
    // 通常は度数法で保存されているため
    return (internalAngle * Math.PI) / 180.0;
  }

  /**
   * ラジアンからJWW内部形式へ
   */
  static fromRadians(radians: number): number {
    return (radians * 180.0) / Math.PI;
  }
}

/**
 * エンディアン変換ユーティリティ
 */
export class EndianConverter {
  /**
   * システムがリトルエンディアンかチェック
   */
  static isLittleEndian(): boolean {
    const buffer = new ArrayBuffer(2);
    const uint8Array = new Uint8Array(buffer);
    const uint16Array = new Uint16Array(buffer);
    
    uint16Array[0] = 0x0102;
    return uint8Array[0] === 0x02;
  }

  /**
   * バイトオーダーを反転
   */
  static swapBytes16(value: number): number {
    return ((value & 0xFF) << 8) | ((value >> 8) & 0xFF);
  }

  static swapBytes32(value: number): number {
    return (
      ((value & 0xFF) << 24) |
      ((value & 0xFF00) << 8) |
      ((value >> 8) & 0xFF00) |
      ((value >> 24) & 0xFF)
    );
  }
}
