/**
 * JWW Canvas Renderer
 * Renders JWW documents to HTML5 Canvas
 */

import type {
  JwwDocument,
  JwwEntity,
  JwwLine,
  JwwCircle,
  JwwArc,
  JwwText,
  JwwEllipse,
  JwwDimension,
  JwwPolyline,
  JwwRendererOptions,
  ViewportState,
  Bounds
} from './types';
import { JWW_COLORS, JWW_LINE_TYPES } from './types';

export class JwwRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: Required<JwwRendererOptions>;
  private viewport: ViewportState;
  private document: JwwDocument | null = null;
  private devicePixelRatio: number;

  constructor(canvas: HTMLCanvasElement, options: JwwRendererOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    this.options = {
      backgroundColor: options.backgroundColor ?? '#FFFFFF',
      antialias: options.antialias ?? true,
      lineWidthScale: options.lineWidthScale ?? 1.0,
      textRenderingMode: options.textRenderingMode ?? 'basic'
    };

    this.viewport = {
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
      rotation: 0
    };

    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.setupCanvas();
  }

  /**
   * Canvas解像度の設定(Retina対応)
   */
  private setupCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * this.devicePixelRatio;
    this.canvas.height = rect.height * this.devicePixelRatio;
    
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    
    this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);

    // アンチエイリアス設定
    this.ctx.imageSmoothingEnabled = this.options.antialias;
  }

  /**
   * ドキュメントをセット
   */
  setDocument(document: JwwDocument) {
    this.document = document;
  }

  /**
   * ビューポート状態を取得
   */
  getViewport(): ViewportState {
    return { ...this.viewport };
  }

  /**
   * ビューポート状態を設定
   */
  setViewport(viewport: Partial<ViewportState>) {
    Object.assign(this.viewport, viewport);
  }

  /**
   * ドキュメントを描画
   */
  render() {
    if (!this.document) {
      console.warn('No document to render');
      return;
    }

    // 背景をクリア
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 変換行列を設定
    this.ctx.save();
    this.setupTransform();

    // エンティティを描画
    for (const entity of this.document.entities) {
      // レイヤーの表示/非表示チェック
      const layer = this.document.layers[entity.layer];
      if (layer && !layer.visible) {
        continue;
      }

      this.renderEntity(entity);
    }

    this.ctx.restore();
  }

  /**
   * 座標変換行列をセットアップ
   */
  private setupTransform() {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // パン
    this.ctx.translate(centerX + this.viewport.offsetX, centerY + this.viewport.offsetY);

    // 回転
    if (this.viewport.rotation !== 0) {
      this.ctx.rotate(this.viewport.rotation);
    }

    // ズーム + Y軸反転(CAD座標系)
    this.ctx.scale(this.viewport.scale, -this.viewport.scale);
  }

  /**
   * エンティティを描画
   */
  private renderEntity(entity: JwwEntity) {
    this.ctx.save();

    // スタイル設定
    this.applyEntityStyle(entity);

    // エンティティタイプ別の描画
    switch (entity.type) {
      case 'line':
        this.renderLine(entity);
        break;
      case 'circle':
        this.renderCircle(entity);
        break;
      case 'arc':
        this.renderArc(entity);
        break;
      case 'text':
        this.renderText(entity);
        break;
      case 'ellipse':
        this.renderEllipse(entity);
        break;
      case 'dimension':
        this.renderDimension(entity);
        break;
      case 'polyline':
        this.renderPolyline(entity);
        break;
      // その他のタイプ
      default:
        console.warn(`Rendering not implemented for entity type: ${entity.type}`);
    }

    this.ctx.restore();
  }

  /**
   * エンティティのスタイルを適用
   */
  private applyEntityStyle(entity: JwwEntity) {
    // 色
    const color = JWW_COLORS[entity.color] || '#000000';
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;

    // 線幅(ズームレベルに応じて調整)
    const lineWidth = entity.lineWidth * this.options.lineWidthScale / this.viewport.scale;
    this.ctx.lineWidth = Math.max(lineWidth, 0.5 / this.viewport.scale);

    // 線種
    const lineDash = JWW_LINE_TYPES[entity.lineType] || [];
    if (lineDash.length > 0) {
      // ズームレベルに応じて線種パターンを調整
      const scaledDash = lineDash.map(d => d / this.viewport.scale);
      this.ctx.setLineDash(scaledDash);
    } else {
      this.ctx.setLineDash([]);
    }

    // 線の終端スタイル
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  /**
   * 線分を描画
   */
  private renderLine(line: JwwLine) {
    this.ctx.beginPath();
    this.ctx.moveTo(line.startX, line.startY);
    this.ctx.lineTo(line.endX, line.endY);
    this.ctx.stroke();
  }

  /**
   * 円を描画
   */
  private renderCircle(circle: JwwCircle) {
    this.ctx.beginPath();
    this.ctx.arc(circle.centerX, circle.centerY, circle.radius, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  /**
   * 円弧を描画
   */
  private renderArc(arc: JwwArc) {
    this.ctx.beginPath();
    this.ctx.arc(
      arc.centerX,
      arc.centerY,
      arc.radius,
      arc.startAngle,
      arc.endAngle,
      !arc.clockwise // Canvas APIでは反時計回りがデフォルト
    );
    this.ctx.stroke();
  }

  /**
   * テキストを描画
   */
  private renderText(text: JwwText) {
    this.ctx.save();

    // Y軸反転を元に戻す(テキスト用)
    this.ctx.scale(1, -1);

    // テキスト位置に移動
    this.ctx.translate(text.x, -text.y);

    // テキスト回転
    if (text.angle !== 0) {
      this.ctx.rotate(-text.angle); // Y軸反転済みなので反転
    }

    // フォント設定
    const fontSize = text.height / this.viewport.scale;
    this.ctx.font = `${fontSize}px "${text.font}", sans-serif`;

    // テキストアライメント
    this.ctx.textAlign = text.horizontalAlign;
    this.ctx.textBaseline = text.verticalAlign;

    // 描画
    if (this.options.textRenderingMode === 'advanced') {
      // アウトライン付き
      this.ctx.strokeText(text.text, 0, 0);
    }
    this.ctx.fillText(text.text, 0, 0);

    this.ctx.restore();
  }

  /**
   * 楕円を描画
   */
  private renderEllipse(ellipse: JwwEllipse) {
    this.ctx.save();

    // 楕円の中心に移動
    this.ctx.translate(ellipse.centerX, ellipse.centerY);

    // 回転を適用
    if (ellipse.rotation !== 0) {
      this.ctx.rotate(ellipse.rotation);
    }

    // Canvas API の ellipse メソッドを使用
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, ellipse.radiusX, ellipse.radiusY, 0, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * 寸法線を描画
   */
  private renderDimension(dimension: JwwDimension) {
    this.ctx.save();

    // 寸法線本体を描画
    this.ctx.beginPath();
    this.ctx.moveTo(dimension.startX, dimension.startY);
    this.ctx.lineTo(dimension.endX, dimension.endY);
    this.ctx.stroke();

    // 矢印のサイズ（ズームレベルに応じて調整）
    const arrowSize = 2.0 / this.viewport.scale;

    // 始点の矢印
    this.drawArrowHead(dimension.startX, dimension.startY, dimension.endX, dimension.endY, arrowSize);

    // 終点の矢印
    this.drawArrowHead(dimension.endX, dimension.endY, dimension.startX, dimension.startY, arrowSize);

    // 寸法テキストを描画
    this.ctx.save();
    this.ctx.scale(1, -1); // Y軸反転を元に戻す
    const fontSize = 3.0 / this.viewport.scale;
    this.ctx.font = `${fontSize}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(dimension.text, dimension.textX, -dimension.textY);
    this.ctx.restore();

    this.ctx.restore();
  }

  /**
   * 矢印の先端を描画するヘルパーメソッド
   */
  private drawArrowHead(fromX: number, fromY: number, toX: number, toY: number, size: number) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowAngle = Math.PI / 6; // 30度

    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(
      fromX - size * Math.cos(angle - arrowAngle),
      fromY - size * Math.sin(angle - arrowAngle)
    );
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(
      fromX - size * Math.cos(angle + arrowAngle),
      fromY - size * Math.sin(angle + arrowAngle)
    );
    this.ctx.stroke();
  }

  /**
   * ポリラインを描画
   */
  private renderPolyline(polyline: JwwPolyline) {
    if (polyline.points.length < 2) {
      return;
    }

    this.ctx.beginPath();

    // 最初の点に移動
    this.ctx.moveTo(polyline.points[0].x, polyline.points[0].y);

    // 残りの点を結ぶ
    for (let i = 1; i < polyline.points.length; i++) {
      this.ctx.lineTo(polyline.points[i].x, polyline.points[i].y);
    }

    // 閉じたポリラインの場合、最初の点に戻る
    if (polyline.closed) {
      this.ctx.closePath();
    }

    this.ctx.stroke();
  }

  /**
   * ドキュメント全体の境界を計算
   */
  calculateBounds(): Bounds | null {
    if (!this.document || this.document.entities.length === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const entity of this.document.entities) {
      const bounds = this.getEntityBounds(entity);
      if (bounds) {
        minX = Math.min(minX, bounds.minX);
        minY = Math.min(minY, bounds.minY);
        maxX = Math.max(maxX, bounds.maxX);
        maxY = Math.max(maxY, bounds.maxY);
      }
    }

    if (!isFinite(minX)) {
      return null;
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * エンティティの境界を計算
   */
  private getEntityBounds(entity: JwwEntity): Bounds | null {
    switch (entity.type) {
      case 'line':
        return {
          minX: Math.min(entity.startX, entity.endX),
          minY: Math.min(entity.startY, entity.endY),
          maxX: Math.max(entity.startX, entity.endX),
          maxY: Math.max(entity.startY, entity.endY),
          width: Math.abs(entity.endX - entity.startX),
          height: Math.abs(entity.endY - entity.startY)
        };

      case 'circle':
        return {
          minX: entity.centerX - entity.radius,
          minY: entity.centerY - entity.radius,
          maxX: entity.centerX + entity.radius,
          maxY: entity.centerY + entity.radius,
          width: entity.radius * 2,
          height: entity.radius * 2
        };

      case 'arc':
        // 簡易実装: 円として扱う
        return {
          minX: entity.centerX - entity.radius,
          minY: entity.centerY - entity.radius,
          maxX: entity.centerX + entity.radius,
          maxY: entity.centerY + entity.radius,
          width: entity.radius * 2,
          height: entity.radius * 2
        };

      case 'text':
        // テキストの境界は簡易的に推定
        const estimatedWidth = entity.text.length * entity.width * 0.6;
        return {
          minX: entity.x,
          minY: entity.y,
          maxX: entity.x + estimatedWidth,
          maxY: entity.y + entity.height,
          width: estimatedWidth,
          height: entity.height
        };

      case 'ellipse':
        // 回転した楕円の境界ボックスを計算
        // 簡易実装: 外接矩形として扱う
        const maxRadius = Math.max(entity.radiusX, entity.radiusY);
        return {
          minX: entity.centerX - maxRadius,
          minY: entity.centerY - maxRadius,
          maxX: entity.centerX + maxRadius,
          maxY: entity.centerY + maxRadius,
          width: maxRadius * 2,
          height: maxRadius * 2
        };

      case 'dimension':
        return {
          minX: Math.min(entity.startX, entity.endX, entity.textX),
          minY: Math.min(entity.startY, entity.endY, entity.textY),
          maxX: Math.max(entity.startX, entity.endX, entity.textX),
          maxY: Math.max(entity.startY, entity.endY, entity.textY),
          width: Math.abs(Math.max(entity.startX, entity.endX, entity.textX) - Math.min(entity.startX, entity.endX, entity.textX)),
          height: Math.abs(Math.max(entity.startY, entity.endY, entity.textY) - Math.min(entity.startY, entity.endY, entity.textY))
        };

      case 'polyline':
        if (entity.points.length === 0) {
          return null;
        }
        const xs = entity.points.map(p => p.x);
        const ys = entity.points.map(p => p.y);
        const minXPoly = Math.min(...xs);
        const minYPoly = Math.min(...ys);
        const maxXPoly = Math.max(...xs);
        const maxYPoly = Math.max(...ys);
        return {
          minX: minXPoly,
          minY: minYPoly,
          maxX: maxXPoly,
          maxY: maxYPoly,
          width: maxXPoly - minXPoly,
          height: maxYPoly - minYPoly
        };

      default:
        return null;
    }
  }

  /**
   * 全体表示にフィット
   */
  fitToView(margin: number = 0.1) {
    const bounds = this.calculateBounds();
    if (!bounds) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    // マージンを考慮したスケール計算
    const marginSize = 1 - margin * 2;
    const scaleX = (canvasWidth * marginSize) / bounds.width;
    const scaleY = (canvasHeight * marginSize) / bounds.height;
    
    this.viewport.scale = Math.min(scaleX, scaleY);

    // 中央に配置
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    this.viewport.offsetX = -centerX * this.viewport.scale;
    this.viewport.offsetY = centerY * this.viewport.scale; // Y軸反転考慮

    this.render();
  }

  /**
   * 指定座標にズーム
   */
  zoomAt(clientX: number, clientY: number, delta: number) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    // ズーム前の座標
    const worldBefore = this.screenToWorld(canvasX, canvasY);

    // ズーム実行
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    this.viewport.scale *= zoomFactor;

    // ズーム後の座標
    const worldAfter = this.screenToWorld(canvasX, canvasY);

    // オフセット調整(マウス位置を中心にズーム)
    this.viewport.offsetX += (worldAfter.x - worldBefore.x) * this.viewport.scale;
    this.viewport.offsetY -= (worldAfter.y - worldBefore.y) * this.viewport.scale;

    this.render();
  }

  /**
   * スクリーン座標をワールド座標に変換
   */
  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const x = (screenX - centerX - this.viewport.offsetX) / this.viewport.scale;
    const y = -(screenY - centerY - this.viewport.offsetY) / this.viewport.scale;

    return { x, y };
  }

  /**
   * 画像としてエクスポート
   */
  exportAsImage(format: 'png' | 'jpeg' = 'png', quality: number = 0.92): string {
    return this.canvas.toDataURL(`image/${format}`, quality);
  }

  /**
   * Canvasをクリア
   */
  clear() {
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * リサイズ対応
   */
  resize() {
    this.setupCanvas();
    this.render();
  }

  /**
   * リソースの解放
   */
  dispose() {
    this.document = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
