/**
 * Viewport Controller
 * Handles user interactions for pan, zoom, and rotation
 */

import { JwwRenderer } from './jww-renderer';

export interface ViewportControllerOptions {
  enablePan?: boolean;
  enableZoom?: boolean;
  enableRotation?: boolean;
  minScale?: number;
  maxScale?: number;
  zoomSpeed?: number;
}

export class ViewportController {
  private renderer: JwwRenderer;
  private canvas: HTMLCanvasElement;
  private options: Required<ViewportControllerOptions>;

  // マウス/タッチ状態
  private isDragging = false;
  private lastMousePos = { x: 0, y: 0 };
  private lastTouchDistance = 0;

  // アニメーション
  private animationFrame: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    renderer: JwwRenderer,
    options: ViewportControllerOptions = {}
  ) {
    this.canvas = canvas;
    this.renderer = renderer;

    this.options = {
      enablePan: options.enablePan ?? true,
      enableZoom: options.enableZoom ?? true,
      enableRotation: options.enableRotation ?? false,
      minScale: options.minScale ?? 0.01,
      maxScale: options.maxScale ?? 100,
      zoomSpeed: options.zoomSpeed ?? 0.1
    };

    this.setupEventListeners();
  }

  /**
   * イベントリスナーのセットアップ
   */
  private setupEventListeners() {
    // マウスホイールでズーム
    if (this.options.enableZoom) {
      this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    }

    // マウスイベント
    if (this.options.enablePan) {
      this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
      this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
      this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
      this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    }

    // タッチイベント
    if (this.options.enablePan || this.options.enableZoom) {
      this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
      this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
      this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
      this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
    }

    // コンテキストメニューを無効化
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // リサイズ対応
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * マウスホイールイベント
   */
  private handleWheel(e: WheelEvent) {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // ズーム方向
    const delta = e.deltaY;
    const zoomFactor = 1 + this.options.zoomSpeed * (delta > 0 ? -1 : 1);

    this.zoomAt(clientX, clientY, zoomFactor);
  }

  /**
   * 指定位置でズーム
   */
  private zoomAt(clientX: number, clientY: number, zoomFactor: number) {
    const viewport = this.renderer.getViewport();

    // 新しいスケールを計算
    const newScale = viewport.scale * zoomFactor;

    // スケール制限
    if (newScale < this.options.minScale || newScale > this.options.maxScale) {
      return;
    }

    // マウス位置を中心にズーム
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // マウス位置とキャンバス中心の差分
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // オフセット調整
    const scaleRatio = zoomFactor - 1;
    viewport.offsetX -= dx * scaleRatio;
    viewport.offsetY -= dy * scaleRatio;
    viewport.scale = newScale;

    this.renderer.setViewport(viewport);
    this.renderer.render();
  }

  /**
   * マウスダウン
   */
  private handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return; // 左クリックのみ

    this.isDragging = true;
    this.lastMousePos = { x: e.clientX, y: e.clientY };
    this.canvas.style.cursor = 'grabbing';
  }

  /**
   * マウスムーブ
   */
  private handleMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;

    const dx = e.clientX - this.lastMousePos.x;
    const dy = e.clientY - this.lastMousePos.y;

    this.pan(dx, dy);

    this.lastMousePos = { x: e.clientX, y: e.clientY };
  }

  /**
   * マウスアップ
   */
  private handleMouseUp() {
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';
  }

  /**
   * パン移動
   */
  private pan(dx: number, dy: number) {
    const viewport = this.renderer.getViewport();
    viewport.offsetX += dx;
    viewport.offsetY += dy;

    this.renderer.setViewport(viewport);
    this.renderer.render();
  }

  /**
   * タッチスタート
   */
  private handleTouchStart(e: TouchEvent) {
    e.preventDefault();

    if (e.touches.length === 1) {
      // シングルタッチ: パン
      const touch = e.touches[0];
      this.lastMousePos = { x: touch.clientX, y: touch.clientY };
      this.isDragging = true;
    } else if (e.touches.length === 2) {
      // ダブルタッチ: ピンチズーム
      this.isDragging = false;

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      this.lastTouchDistance = this.getTouchDistance(touch1, touch2);
    }
  }

  /**
   * タッチムーブ
   */
  private handleTouchMove(e: TouchEvent) {
    e.preventDefault();

    if (e.touches.length === 1 && this.isDragging) {
      // シングルタッチ: パン
      const touch = e.touches[0];
      const dx = touch.clientX - this.lastMousePos.x;
      const dy = touch.clientY - this.lastMousePos.y;

      this.pan(dx, dy);

      this.lastMousePos = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
      // ダブルタッチ: ピンチズーム
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const distance = this.getTouchDistance(touch1, touch2);
      const center = this.getTouchCenter(touch1, touch2);

      if (this.lastTouchDistance > 0) {
        const zoomFactor = distance / this.lastTouchDistance;

        const rect = this.canvas.getBoundingClientRect();
        const clientX = center.x - rect.left;
        const clientY = center.y - rect.top;

        this.zoomAt(clientX, clientY, zoomFactor);
      }

      this.lastTouchDistance = distance;
    }
  }

  /**
   * タッチエンド
   */
  private handleTouchEnd() {
    this.isDragging = false;
    this.lastTouchDistance = 0;
  }

  /**
   * 2点間の距離を計算
   */
  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 2点の中心を計算
   */
  private getTouchCenter(touch1: Touch, touch2: Touch): { x: number; y: number } {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }

  /**
   * リサイズイベント
   */
  private handleResize() {
    this.renderer.resize();
  }

  /**
   * 全体表示
   */
  fitToView(margin: number = 0.1) {
    this.renderer.fitToView(margin);
  }

  /**
   * ビューのリセット
   */
  resetView() {
    this.renderer.setViewport({
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
      rotation: 0
    });
    this.renderer.render();
  }

  /**
   * カーソルスタイルの設定
   */
  setCursor(cursor: string) {
    this.canvas.style.cursor = cursor;
  }

  /**
   * リソースの解放
   */
  dispose() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    // イベントリスナーの削除
    this.canvas.removeEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener('touchcancel', this.handleTouchEnd.bind(this));
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}
