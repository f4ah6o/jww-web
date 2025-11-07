# JW_CAD Viewer 実装計画

## プロジェクト概要

- **目標**: クライアントサイドで動作するjwcadファイルビューアー
- **プラットフォーム**: Web(PWA) + iOS
- **アーキテクチャ**: サーバーレス、完全クライアントサイド

## フェーズ1: リサーチと準備 (1週間)

### 1.1 フォーマット仕様の理解

```
タスク:
- [x] JwwExchangeのコード分析
- [ ] LibreCAD jwwlibのデータ構造確認
- [ ] JWWファイルフォーマット仕様書の入手
- [ ] サンプルJWWファイルの収集
```

### 1.2 既存実装の評価

```typescript
// JwwExchangeのC#コードを参照して、主要なクラス構造を確認
interface JwwDocument {
  header: JwwHeader;
  layers: JwwLayer[];
  entities: JwwEntity[];
}

interface JwwHeader {
  version: string;
  scale: number;
  // その他のヘッダー情報
}

interface JwwEntity {
  type: 'line' | 'circle' | 'arc' | 'text' | 'dimension';
  layer: number;
  color: number;
  lineType: number;
  // エンティティ固有のプロパティ
}
```

## フェーズ2: Pure TypeScript パーサー実装 (2-3週間)

### 2.1 推奨アプローチ: WASM不要の理由

**WASMを使わない理由:**

1. JWWファイルは比較的小さい(通常数MB以下)
1. パース処理は一度のみ
1. TypeScriptの方がデバッグとメンテナンスが容易
1. バイナリ処理はDataView/ArrayBufferで十分高速
1. WASMビルドチェーンの複雑さを回避

### 2.2 実装ステップ

```typescript
// ステップ1: バイナリリーダー
class JwwBinaryReader {
  private view: DataView;
  private offset: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  readByte(): number {
    return this.view.getUint8(this.offset++);
  }

  readInt16(): number {
    const value = this.view.getInt16(this.offset, true); // little-endian
    this.offset += 2;
    return value;
  }

  readInt32(): number {
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readDouble(): number {
    const value = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }

  readString(length: number, encoding: string = 'shift-jis'): string {
    const bytes = new Uint8Array(this.view.buffer, this.offset, length);
    this.offset += length;
    
    // Shift-JISデコード (encoding-japanese等のライブラリを使用)
    return decodeShiftJIS(bytes);
  }
}

// ステップ2: パーサー
class JwwParser {
  async parse(file: File): Promise<JwwDocument> {
    const buffer = await file.arrayBuffer();
    const reader = new JwwBinaryReader(buffer);
    
    // ヘッダー読み込み
    const header = this.parseHeader(reader);
    
    // レイヤー情報読み込み
    const layers = this.parseLayers(reader, header);
    
    // エンティティ読み込み
    const entities = this.parseEntities(reader, header);
    
    return {
      header,
      layers,
      entities
    };
  }

  private parseHeader(reader: JwwBinaryReader): JwwHeader {
    // JWWファイルヘッダーの解析
    // 参照: JwwExchangeのJwwDataクラス
    return {
      signature: reader.readString(4), // "JWW" or "JWS"
      version: reader.readInt16(),
      // ...
    };
  }

  private parseEntities(reader: JwwBinaryReader, header: JwwHeader): JwwEntity[] {
    const entities: JwwEntity[] = [];
    
    // エンティティタイプごとに処理
    // 参照: JwwExchangeの各エンティティクラス(JwwSen, JwwCircle等)
    
    return entities;
  }
}
```

## フェーズ3: レンダリングエンジン実装 (2週間)

### 3.1 レンダリングエンジンの選択

**推奨: Canvas 2D API**

理由:

- シンプルで軽量
- CAD特有の線種・色の表現が容易
- パフォーマンスが良好
- ブラウザサポートが安定

```typescript
class JwwRenderer {
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;
  private offset: { x: number; y: number } = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  render(document: JwwDocument) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    
    // 変換行列の設定
    this.ctx.save();
    this.ctx.translate(this.offset.x, this.offset.y);
    this.ctx.scale(this.scale, -this.scale); // Y軸反転(CAD座標系)
    
    // エンティティの描画
    for (const entity of document.entities) {
      this.renderEntity(entity);
    }
    
    this.ctx.restore();
  }

  private renderEntity(entity: JwwEntity) {
    switch (entity.type) {
      case 'line':
        this.renderLine(entity as JwwLine);
        break;
      case 'circle':
        this.renderCircle(entity as JwwCircle);
        break;
      case 'arc':
        this.renderArc(entity as JwwArc);
        break;
      case 'text':
        this.renderText(entity as JwwText);
        break;
      // その他のエンティティタイプ
    }
  }

  private renderLine(line: JwwLine) {
    this.ctx.strokeStyle = this.getColor(line.color);
    this.ctx.lineWidth = line.lineWidth / this.scale;
    this.ctx.setLineDash(this.getLineDash(line.lineType));
    
    this.ctx.beginPath();
    this.ctx.moveTo(line.startX, line.startY);
    this.ctx.lineTo(line.endX, line.endY);
    this.ctx.stroke();
  }

  private getColor(colorCode: number): string {
    // JWW色番号からRGB変換
    const colorMap: Record<number, string> = {
      1: '#000000', // 黒
      2: '#FF0000', // 赤
      3: '#00FF00', // 緑
      4: '#0000FF', // 青
      // ... JWW色定義に従う
    };
    return colorMap[colorCode] || '#000000';
  }

  private getLineDash(lineType: number): number[] {
    // 線種の定義
    const lineTypeMap: Record<number, number[]> = {
      0: [],           // 実線
      1: [5, 3],       // 破線
      2: [10, 3, 2, 3], // 一点鎖線
      // ... JWW線種定義に従う
    };
    return lineTypeMap[lineType] || [];
  }
}
```

### 3.2 ビューポート制御

```typescript
class JwwViewport {
  private renderer: JwwRenderer;
  private canvas: HTMLCanvasElement;
  private isDragging = false;
  private lastMousePos = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement, renderer: JwwRenderer) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // マウスホイールでズーム
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.renderer.scale *= delta;
      this.renderer.render();
    });

    // ドラッグでパン
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastMousePos.x;
        const dy = e.clientY - this.lastMousePos.y;
        this.renderer.offset.x += dx;
        this.renderer.offset.y += dy;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.renderer.render();
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // ピンチズーム(タッチデバイス)
    let lastTouchDistance = 0;
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        
        if (lastTouchDistance > 0) {
          const scale = distance / lastTouchDistance;
          this.renderer.scale *= scale;
          this.renderer.render();
        }
        
        lastTouchDistance = distance;
      }
    });

    this.canvas.addEventListener('touchend', () => {
      lastTouchDistance = 0;
    });
  }

  fitToView(document: JwwDocument) {
    // 全体表示の計算
    const bounds = this.calculateBounds(document);
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    
    const scaleX = canvasWidth / bounds.width;
    const scaleY = canvasHeight / bounds.height;
    this.renderer.scale = Math.min(scaleX, scaleY) * 0.9; // 90%に収める
    
    this.renderer.offset.x = -bounds.minX * this.renderer.scale + canvasWidth * 0.05;
    this.renderer.offset.y = -bounds.minY * this.renderer.scale + canvasHeight * 0.05;
    
    this.renderer.render();
  }

  private calculateBounds(document: JwwDocument) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const entity of document.entities) {
      // エンティティタイプごとに境界を計算
      // ...
    }
    
    return {
      minX, minY, maxX, maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
}
```

## フェーズ4: Webアプリケーション実装 (1週間)

### 4.1 React/Vue/Svelteでの実装例

```typescript
// React + TypeScriptの例
import React, { useRef, useEffect, useState } from 'react';
import { JwwParser, JwwRenderer, JwwViewport, JwwDocument } from './jww';

export const JwwViewer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<JwwDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (canvasRef.current && document) {
      const renderer = new JwwRenderer(canvasRef.current);
      const viewport = new JwwViewport(canvasRef.current, renderer);
      
      renderer.render(document);
      viewport.fitToView(document);
    }
  }, [document]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const parser = new JwwParser();
      const doc = await parser.parse(file);
      setDocument(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : '読み込みエラー');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jww-viewer">
      <div className="toolbar">
        <input
          type="file"
          accept=".jww,.jws"
          onChange={handleFileSelect}
        />
        {loading && <div>読み込み中...</div>}
        {error && <div className="error">{error}</div>}
      </div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: '1px solid #ccc' }}
      />
    </div>
  );
};
```

### 4.2 PWA化

```json
// manifest.json
{
  "name": "JW_CAD Viewer",
  "short_name": "JWWViewer",
  "description": "クライアントサイドJWCADファイルビューアー",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

```typescript
// service-worker.ts
const CACHE_NAME = 'jww-viewer-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

## フェーズ5: iOSアプリ化 (1週間)

### 5.1 Capacitorでのラップ

```bash
# Capacitorのセットアップ
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init
npx cap add ios

# iOSプロジェクトを開く
npx cap open ios
```

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.jwwviewer',
  appName: 'JWW Viewer',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'always'
  }
};

export default config;
```

### 5.2 ファイルアクセス対応

```typescript
import { Filesystem, Directory } from '@capacitor/filesystem';

// iOSでのファイル選択
async function selectFile(): Promise<File> {
  // iOS Files appからの選択
  const result = await Filesystem.pickFiles({
    types: ['public.data'],
    multiple: false
  });
  
  const fileData = await Filesystem.readFile({
    path: result.files[0].path
  });
  
  // Base64からArrayBufferに変換
  const buffer = base64ToArrayBuffer(fileData.data);
  return new File([buffer], result.files[0].name);
}
```

## フェーズ6: テストと最適化 (1-2週間)

### 6.1 テストケース

```typescript
// jww-parser.test.ts
import { describe, it, expect } from 'vitest';
import { JwwParser } from './jww-parser';

describe('JwwParser', () => {
  it('should parse simple line', async () => {
    const mockFile = createMockJwwFile({
      entities: [
        { type: 'line', x1: 0, y1: 0, x2: 100, y2: 100 }
      ]
    });
    
    const parser = new JwwParser();
    const doc = await parser.parse(mockFile);
    
    expect(doc.entities).toHaveLength(1);
    expect(doc.entities[0].type).toBe('line');
  });

  it('should handle Shift-JIS text', async () => {
    // 日本語テキストを含むJWWファイルのテスト
  });

  it('should parse complex drawing', async () => {
    // 実際のJWWファイルを使ったインテグレーションテスト
  });
});
```

### 6.2 パフォーマンス最適化

```typescript
// Web Workerでのパース処理
// jww-parser.worker.ts
import { JwwParser } from './jww-parser';

self.addEventListener('message', async (e) => {
  const { file } = e.data;
  
  try {
    const parser = new JwwParser();
    const document = await parser.parse(file);
    
    self.postMessage({ success: true, document });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
});

// メインスレッドから使用
const worker = new Worker(new URL('./jww-parser.worker.ts', import.meta.url));

worker.postMessage({ file });
worker.addEventListener('message', (e) => {
  if (e.data.success) {
    setDocument(e.data.document);
  } else {
    setError(e.data.error);
  }
});
```

## 技術スタック

### フロントエンド

- **言語**: TypeScript
- **フレームワーク**: React / Vue / Svelte (選択)
- **ビルドツール**: Vite
- **テスト**: Vitest + Testing Library
- **文字エンコード**: encoding-japanese (Shift-JIS対応)

### モバイル

- **iOS**: Capacitor
- **ファイルシステム**: @capacitor/filesystem

### デプロイ

- **Web**: Vercel / Netlify / GitHub Pages
- **iOS**: App Store (TestFlight経由)

## スケジュール概要

|フェーズ  |期間        |タスク             |
|------|----------|----------------|
|1     |1週間       |リサーチ・仕様確認       |
|2     |2-3週間     |TypeScriptパーサー実装|
|3     |2週間       |レンダリングエンジン実装    |
|4     |1週間       |Webアプリ実装        |
|5     |1週間       |iOS対応           |
|6     |1-2週間     |テスト・最適化         |
|**合計**|**8-10週間**|                |

## 成功の鍵

1. **WASM不要**: Pure TypeScriptで十分高速
1. **段階的実装**: パーサー → レンダラー → UI
1. **実ファイルでの検証**: 各フェーズで実際のJWWファイルを使用
1. **JwwExchangeの活用**: C#コードから構造とロジックを学ぶ
1. **モダンなツール**: Vite, TypeScript, Capacitorで効率化

## リスクと対策

|リスク            |対策                        |
|---------------|--------------------------|
|JWWフォーマット仕様の不明点|JwwExchangeソースコードと実ファイルで検証|
|複雑なエンティティ      |段階的実装(線→円→テキスト…)          |
|パフォーマンス問題      |Web Worker、Canvas最適化      |
|iOS特有の問題       |Capacitorコミュニティ活用         |

## 参考リソース

- JwwExchange: https://github.com/JinkiKeikaku/JwwExchange
- JwwHelperSample: https://github.com/JinkiKeikaku/JwwHelperSample
- LibreCAD jwwlib: https://github.com/LibreCAD/LibreCAD/tree/master/libraries/jwwlib
- Capacitor: https://capacitorjs.com/
- encoding-japanese: https://github.com/polygonplanet/encoding.js
