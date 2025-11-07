/**
 * JW_CAD Document Types
 * Based on JwwExchange C# implementation
 */

// ========================================
// Header Types
// ========================================

export interface JwwHeader {
  signature: string;        // "JWW" or "JWS"
  version: number;          // バージョン番号
  scale: number;            // 縮尺
  offsetX: number;          // 原点オフセットX
  offsetY: number;          // 原点オフセットY
  angle: number;            // 回転角度
  layerCount: number;       // レイヤー数
  groupCount: number;       // グループ数
}

// ========================================
// Layer Types
// ========================================

export interface JwwLayer {
  number: number;           // レイヤー番号 (0-15)
  name: string;             // レイヤー名
  visible: boolean;         // 表示/非表示
  locked: boolean;          // ロック状態
  color: number;            // デフォルト色
  lineType: number;         // デフォルト線種
}

// ========================================
// Entity Types
// ========================================

export type JwwEntityType = 
  | 'line'
  | 'circle'
  | 'arc'
  | 'ellipse'
  | 'text'
  | 'dimension'
  | 'point'
  | 'solid'
  | 'hatch'
  | 'polyline'
  | 'block';

export interface JwwEntityBase {
  type: JwwEntityType;
  layer: number;            // レイヤー番号
  color: number;            // 色番号 (0-255)
  lineType: number;         // 線種番号
  lineWidth: number;        // 線幅
  group: number;            // グループ番号
}

// 線分
export interface JwwLine extends JwwEntityBase {
  type: 'line';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// 円
export interface JwwCircle extends JwwEntityBase {
  type: 'circle';
  centerX: number;
  centerY: number;
  radius: number;
}

// 円弧
export interface JwwArc extends JwwEntityBase {
  type: 'arc';
  centerX: number;
  centerY: number;
  radius: number;
  startAngle: number;       // ラジアン
  endAngle: number;         // ラジアン
  clockwise: boolean;       // 時計回りフラグ
}

// 楕円
export interface JwwEllipse extends JwwEntityBase {
  type: 'ellipse';
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  rotation: number;         // 回転角度(ラジアン)
}

// テキスト
export interface JwwText extends JwwEntityBase {
  type: 'text';
  x: number;
  y: number;
  text: string;
  height: number;           // 文字高さ
  width: number;            // 文字幅
  angle: number;            // 回転角度(ラジアン)
  font: string;             // フォント名
  horizontalAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
}

// 寸法線
export interface JwwDimension extends JwwEntityBase {
  type: 'dimension';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  textX: number;
  textY: number;
  value: number;            // 寸法値
  text: string;             // 寸法テキスト
  dimensionType: 'linear' | 'aligned' | 'angular' | 'radius' | 'diameter';
}

// 点
export interface JwwPoint extends JwwEntityBase {
  type: 'point';
  x: number;
  y: number;
}

// ソリッド(塗りつぶし)
export interface JwwSolid extends JwwEntityBase {
  type: 'solid';
  points: Array<{ x: number; y: number }>;
  fillColor: number;
}

// ハッチング
export interface JwwHatch extends JwwEntityBase {
  type: 'hatch';
  boundary: Array<{ x: number; y: number }>;
  pattern: number;          // パターン番号
  scale: number;            // スケール
  angle: number;            // 角度
}

// ポリライン
export interface JwwPolyline extends JwwEntityBase {
  type: 'polyline';
  points: Array<{ x: number; y: number }>;
  closed: boolean;          // 閉じたポリライン
}

// ブロック参照
export interface JwwBlock extends JwwEntityBase {
  type: 'block';
  name: string;             // ブロック名
  x: number;                // 挿入点X
  y: number;                // 挿入点Y
  scaleX: number;           // X方向スケール
  scaleY: number;           // Y方向スケール
  rotation: number;         // 回転角度
}

export type JwwEntity = 
  | JwwLine
  | JwwCircle
  | JwwArc
  | JwwEllipse
  | JwwText
  | JwwDimension
  | JwwPoint
  | JwwSolid
  | JwwHatch
  | JwwPolyline
  | JwwBlock;

// ========================================
// Document Type
// ========================================

export interface JwwDocument {
  header: JwwHeader;
  layers: JwwLayer[];
  entities: JwwEntity[];
  blocks?: Map<string, JwwEntity[]>;  // ブロック定義
}

// ========================================
// Color Constants
// ========================================

export const JWW_COLORS: Record<number, string> = {
  0: '#000000',   // 黒
  1: '#FF0000',   // 赤
  2: '#00FF00',   // 緑
  3: '#0000FF',   // 青
  4: '#FFFF00',   // 黄
  5: '#FF00FF',   // マゼンタ
  6: '#00FFFF',   // シアン
  7: '#FFFFFF',   // 白
  8: '#808080',   // グレー
  // ... その他の色定義
};

// ========================================
// Line Type Constants
// ========================================

export const JWW_LINE_TYPES: Record<number, number[]> = {
  0: [],                    // 実線
  1: [5, 3],               // 破線
  2: [10, 3, 2, 3],        // 一点鎖線
  3: [10, 3, 2, 3, 2, 3], // 二点鎖線
  4: [2, 2],               // 点線
  // ... その他の線種定義
};

// ========================================
// Bounds Type
// ========================================

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

// ========================================
// Parser Options
// ========================================

export interface JwwParserOptions {
  encoding?: 'shift-jis' | 'utf-8';  // 文字エンコーディング
  strictMode?: boolean;               // 厳密モード(エラーで停止)
  skipInvalidEntities?: boolean;      // 無効なエンティティをスキップ
}

// ========================================
// Renderer Options
// ========================================

export interface JwwRendererOptions {
  backgroundColor?: string;           // 背景色
  antialias?: boolean;                // アンチエイリアス
  lineWidthScale?: number;            // 線幅スケール
  textRenderingMode?: 'basic' | 'advanced'; // テキストレンダリング
}

// ========================================
// Viewport State
// ========================================

export interface ViewportState {
  scale: number;            // ズームレベル
  offsetX: number;          // パンオフセットX
  offsetY: number;          // パンオフセットY
  rotation: number;         // ビュー回転角度
}
