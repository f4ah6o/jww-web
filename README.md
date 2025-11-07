# JWW Web Viewer

クライアントサイドで動作するJW_CADファイルビューアー

## 概要

このプロジェクトは、Pure TypeScriptで実装されたJWWファイル（JW_CAD形式）のWebビューアーです。
サーバーレスで完全にクライアントサイドで動作し、ファイルはブラウザ内でのみ処理されます。

## 特徴

- ✅ **完全クライアントサイド**: ファイルはサーバーにアップロードされません
- ✅ **Pure TypeScript実装**: WASM不要、メンテナンスが容易
- ✅ **Canvas 2Dレンダリング**: 高速で軽量
- ✅ **レスポンシブデザイン**: デスクトップ・モバイル対応
- ✅ **パン・ズーム対応**: マウス・タッチ操作に対応
- ✅ **PNG出力**: 表示中の図面をPNG画像として保存可能

## サポート機能

### 現在サポートされているエンティティ
- ✅ 線分 (Line)
- ✅ 円 (Circle)
- ✅ 円弧 (Arc)
- ✅ テキスト (Text)

### 今後実装予定
- ⏳ 楕円 (Ellipse)
- ⏳ 寸法線 (Dimension)
- ⏳ ポリライン (Polyline)
- ⏳ ハッチング (Hatch)
- ⏳ ブロック (Block)

## 開発環境のセットアップ

### 必要な環境
- Node.js 18.x 以上
- npm 9.x 以上

### インストール

```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev

# ブラウザで http://localhost:3000 にアクセス
```

### ビルド

```bash
# プロダクションビルド
npm run build

# ビルド結果のプレビュー
npm run preview
```

## 使い方

1. ブラウザでアプリケーションを開く
2. 「ファイルを開く」ボタンをクリックするか、JWWファイルをドラッグ&ドロップ
3. 図面が表示されます

### 操作方法

- **パン（移動）**: マウスドラッグ / タッチスワイプ
- **ズーム**: マウスホイール / ピンチ
- **全体表示**: 「全体表示」ボタンをクリック
- **リセット**: 「リセット」ボタンで表示をリセット
- **PNG保存**: 「PNG保存」ボタンで画像として保存

## プロジェクト構造

```
jww-web/
├── src/
│   ├── types.ts              # JWW型定義
│   ├── binary-reader.ts      # バイナリファイルリーダー
│   ├── jww-parser.ts         # JWWパーサー
│   ├── jww-renderer.ts       # Canvas 2Dレンダラー
│   ├── viewport-controller.ts # ビューポート制御
│   ├── components/
│   │   └── JwwViewer.tsx     # メインコンポーネント
│   ├── App.tsx               # アプリケーション
│   ├── main.tsx              # エントリーポイント
│   └── index.css             # グローバルスタイル
├── index.html                # HTML
├── package.json              # パッケージ定義
├── tsconfig.json             # TypeScript設定
├── vite.config.ts            # Vite設定
└── README.md                 # このファイル
```

## 技術スタック

- **言語**: TypeScript 5.x
- **フレームワーク**: React 18.x
- **ビルドツール**: Vite 5.x
- **レンダリング**: Canvas 2D API
- **文字エンコーディング**: encoding-japanese (Shift-JIS対応)

## 実装の詳細

### パーサー
JWWファイルのバイナリ形式を解析し、ドキュメントオブジェクトに変換します。
[JwwExchange](https://github.com/JinkiKeikaku/JwwExchange)のC#実装を参考にしています。

### レンダラー
HTML5 Canvas 2D APIを使用して図面を描画します。
CAD座標系（Y軸上向き）からスクリーン座標系への変換を行います。

### ビューポートコントローラー
マウスとタッチイベントを処理し、パン・ズーム機能を実装しています。

## デプロイ

### 静的ホスティング

ビルド後の `dist` フォルダを以下のサービスにデプロイできます：

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

```bash
# ビルド
npm run build

# dist/ フォルダをデプロイ
```

## iOS対応（今後の予定）

Capacitorを使用してiOSアプリ化する予定です。

```bash
# Capacitorのインストール
npm install @capacitor/core @capacitor/cli @capacitor/ios

# iOSプロジェクトの追加
npx cap add ios
npx cap open ios
```

## ライセンス

MIT License

## 参考リソース

- [JwwExchange](https://github.com/JinkiKeikaku/JwwExchange) - C#によるJWW実装
- [LibreCAD jwwlib](https://github.com/LibreCAD/LibreCAD/tree/master/libraries/jwwlib) - JWWライブラリ
- [encoding-japanese](https://github.com/polygonplanet/encoding.js) - 文字エンコーディングライブラリ

## 貢献

バグ報告や機能要望は Issues でお願いします。

## 注意事項

- このビューアーは表示専用です。JWWファイルの編集機能はありません
- すべてのJWWファイル形式に対応しているわけではありません
- 一部の複雑なエンティティは表示されない場合があります