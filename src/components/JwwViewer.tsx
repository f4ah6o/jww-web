/**
 * JWW Viewer React Component
 */

import React, { useRef, useEffect, useState } from 'react';
import { JwwParser } from '../jww-parser';
import { JwwRenderer } from '../jww-renderer';
import { ViewportController } from '../viewport-controller';
import type { JwwDocument } from '../types';

export interface JwwViewerProps {
  className?: string;
  onDocumentLoad?: (document: JwwDocument) => void;
  onError?: (error: Error) => void;
}

export const JwwViewer: React.FC<JwwViewerProps> = ({
  className,
  onDocumentLoad,
  onError
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<JwwRenderer | null>(null);
  const controllerRef = useRef<ViewportController | null>(null);

  const [jwwDocument, setJwwDocument] = useState<JwwDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileInfo, setFileInfo] = useState<{
    entityCount: number;
    layerCount: number;
    fileSize: number;
  } | null>(null);

  // Canvasの初期化
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const renderer = new JwwRenderer(canvasRef.current, {
        backgroundColor: '#F5F5F5',
        antialias: true,
        lineWidthScale: 1.0
      });

      const controller = new ViewportController(canvasRef.current, renderer, {
        enablePan: true,
        enableZoom: true,
        minScale: 0.01,
        maxScale: 100
      });

      rendererRef.current = renderer;
      controllerRef.current = controller;

      // カーソルスタイル
      canvasRef.current.style.cursor = 'grab';
    } catch (err) {
      console.error('Failed to initialize renderer:', err);
      setError('レンダラーの初期化に失敗しました');
    }

    return () => {
      controllerRef.current?.dispose();
      rendererRef.current?.dispose();
    };
  }, []);

  // ドキュメントが読み込まれたら描画
  useEffect(() => {
    if (!jwwDocument || !rendererRef.current) return;

    rendererRef.current.setDocument(jwwDocument);
    rendererRef.current.render();

    // 全体表示
    setTimeout(() => {
      controllerRef.current?.fitToView(0.1);
    }, 100);

    // 情報を更新
    setFileInfo({
      entityCount: jwwDocument.entities.length,
      layerCount: jwwDocument.layers.length,
      fileSize: 0 // ファイル選択時に設定
    });

    onDocumentLoad?.(jwwDocument);
  }, [jwwDocument, onDocumentLoad]);

  // ファイル選択
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      // ファイル検証
      const isValid = await JwwParser.validate(file);
      if (!isValid) {
        throw new Error('有効なJWWファイルではありません');
      }

      // パース
      const parser = new JwwParser({
        encoding: 'shift-jis',
        strictMode: false,
        skipInvalidEntities: true
      });

      const doc = await parser.parse(file);
      setJwwDocument(doc);
      setFileInfo(prev => prev ? { ...prev, fileSize: file.size } : null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '読み込みエラー';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      console.error('Parse error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ドラッグ&ドロップ
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (!file) return;

    // 擬似的にinput changeイベントを発火
    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  // ツールバーアクション
  const handleFitToView = () => {
    controllerRef.current?.fitToView(0.1);
  };

  const handleResetView = () => {
    controllerRef.current?.resetView();
  };

  const handleExport = () => {
    if (!rendererRef.current) return;

    const dataUrl = rendererRef.current.exportAsImage('png');
    const link = document.createElement('a');
    link.download = fileName.replace(/\.jww$/i, '.png') || 'jww-export.png';
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className={`jww-viewer ${className || ''}`} style={styles.container}>
      {/* ツールバー */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jww,.jws"
            onChange={handleFileSelect}
            style={styles.fileInput}
            id="file-input"
          />
          <label htmlFor="file-input" style={styles.button}>
            📁 ファイルを開く
          </label>

          {fileName && (
            <span style={styles.fileName}>
              {fileName}
            </span>
          )}
        </div>

        <div style={styles.toolbarRight}>
          {jwwDocument && (
            <>
              <button onClick={handleFitToView} style={styles.button}>
                🔍 全体表示
              </button>
              <button onClick={handleResetView} style={styles.button}>
                ↺ リセット
              </button>
              <button onClick={handleExport} style={styles.button}>
                💾 PNG保存
              </button>
            </>
          )}
        </div>
      </div>

      {/* 情報バー */}
      {fileInfo && (
        <div style={styles.infoBar}>
          <span>エンティティ: {fileInfo.entityCount}</span>
          <span style={styles.separator}>|</span>
          <span>レイヤー: {fileInfo.layerCount}</span>
          <span style={styles.separator}>|</span>
          <span>サイズ: {(fileInfo.fileSize / 1024).toFixed(1)} KB</span>
        </div>
      )}

      {/* キャンバス */}
      <div
        style={styles.canvasContainer}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <canvas
          ref={canvasRef}
          style={styles.canvas}
        />

        {/* ローディング表示 */}
        {loading && (
          <div style={styles.overlay}>
            <div style={styles.loader}>読み込み中...</div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div style={styles.overlay}>
            <div style={styles.error}>
              ⚠️ {error}
            </div>
          </div>
        )}

        {/* 初期メッセージ */}
        {!jwwDocument && !loading && !error && (
          <div style={styles.overlay}>
            <div style={styles.placeholder}>
              <div style={styles.placeholderIcon}>📂</div>
              <div>JWWファイルをドラッグ&ドロップ</div>
              <div style={styles.placeholderSub}>または「ファイルを開く」ボタンをクリック</div>
            </div>
          </div>
        )}
      </div>

      {/* 操作ヘルプ */}
      {jwwDocument && (
        <div style={styles.helpBar}>
          <span>🖱️ ドラッグ: パン</span>
          <span style={styles.separator}>|</span>
          <span>🔄 ホイール: ズーム</span>
          <span style={styles.separator}>|</span>
          <span>📱 ピンチ: ズーム</span>
        </div>
      )}
    </div>
  );
};

// インラインスタイル
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100vh',
    backgroundColor: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#2C3E50',
    color: '#FFFFFF',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  fileInput: {
    display: 'none'
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#3498DB',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap'
  },
  fileName: {
    fontSize: '14px',
    fontWeight: 'bold',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  infoBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#ECF0F1',
    fontSize: '13px',
    color: '#2C3E50'
  },
  separator: {
    color: '#BDC3C7'
  },
  canvasContainer: {
    position: 'relative',
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5'
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none'
  },
  loader: {
    padding: '20px 40px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '8px',
    fontSize: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  error: {
    padding: '20px 40px',
    backgroundColor: 'rgba(231, 76, 60, 0.95)',
    color: '#FFFFFF',
    borderRadius: '8px',
    fontSize: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  placeholder: {
    textAlign: 'center',
    color: '#95A5A6',
    fontSize: '18px'
  },
  placeholderIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  placeholderSub: {
    fontSize: '14px',
    marginTop: '8px'
  },
  helpBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#34495E',
    color: '#ECF0F1',
    fontSize: '12px'
  }
};
