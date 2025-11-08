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
- ✅ **PWA対応**: オフライン動作、ホーム画面に追加可能
- ✅ **iOS対応**: Capacitorによるネイティブアプリ化
- ✅ **包括的なテスト**: Vitest統合で33個以上のテストをサポート
- ✅ **Biome統合**: 最新の高速フォーマッタ・リンター

## サポート機能

### 現在サポートされているエンティティ
- ✅ 線分 (Line)
- ✅ 円 (Circle)
- ✅ 円弧 (Arc)
- ✅ テキスト (Text)
- ✅ 楕円 (Ellipse)
- ✅ 寸法線 (Dimension)
- ✅ ポリライン (Polyline)
- ✅ 点 (Point)
- ✅ ソリッド (Solid)
- ✅ ハッチング (Hatch)
- ✅ ブロック (Block)

## 開発環境のセットアップ

### 必要な環境
- Node.js 18.x 以上
- npm 9.x 以上（または pnpm/yarn）
- iOS開発環境: Xcode（Capacitor iOS開発時）

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

### テスト

```bash
# テストを実行
npm run test

# ウォッチモードでテストを実行
npm run test -- --watch
```

### コード品質

```bash
# Biomeでコードを整形・検査
npm run lint
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
│   ├── types.ts                         # JWW型定義
│   ├── binary-reader.ts                 # バイナリファイルリーダー
│   ├── jww-parser.ts                    # JWWパーサー
│   ├── jww-parser.test.ts               # パーサーテスト (33+)
│   ├── jww-renderer.ts                  # Canvas 2Dレンダラー
│   ├── viewport-controller.ts           # ビューポート制御
│   ├── test-helpers/
│   │   └── jww-test-data.ts             # テストヘルパー
│   ├── components/
│   │   └── JwwViewer.tsx                # メインコンポーネント
│   ├── App.tsx                          # アプリケーション
│   ├── main.tsx                         # エントリーポイント（PWA）
│   └── index.css                        # グローバルスタイル
├── index.html                           # HTML
├── public/
│   ├── manifest.webmanifest             # PWAマニフェスト
│   └── icons/                           # PWAアイコン
├── capacitor.config.ts                  # Capacitor設定
├── package.json                         # パッケージ定義
├── tsconfig.json                        # TypeScript設定
├── vite.config.ts                       # Vite + PWA設定
├── vitest.config.ts                     # Vitest設定
├── biome.json                           # Biome設定
└── README.md                            # このファイル
```

## 技術スタック

- **言語**: TypeScript 5.5
- **フレームワーク**: React 18.3
- **ビルドツール**: Vite 5.4
- **レンダリング**: Canvas 2D API
- **文字エンコーディング**: encoding-japanese (Shift-JIS対応)
- **テスト**: Vitest 2.0 (33+ 総合テスト)
- **コード品質**: Biome 1.8 (フォーマッタ・リンター)
- **モバイル**: Capacitor 7.4 (iOS/Android対応)
- **PWA**: vite-plugin-pwa 1.1 (Service Worker統合)

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

## PWA & iOS対応

### PWA（Progressive Web App）

Service Workerによるオフライン対応とホーム画面へのインストールに対応しています。

#### 主な機能
- オフライン動作（キャッシング戦略）
- ホーム画面にインストール可能
- デスクトップ・モバイル対応

#### コマンド
```bash
# PWAビルド（アイコン生成・Service Worker統合）
npm run build:pwa

# 開発環境でPWAテスト
npm run preview
```

### iOSネイティブアプリ

Capacitorを使用してiOSネイティブアプリ化に対応しています。

#### 主な機能
- Native iOS UI統合
- デバイスストレージアクセス
- ステータスバー・セーフエリア対応

#### コマンド
```bash
# iOSアプリのビルド（ファイル同期 + Xcode起動）
npm run build:ios

# iOSプロジェクトを開く
npm run cap:open:ios

# iOSデバイスで実行
npm run cap:run:ios

# iOS同期のみ
npm run cap:sync
```

詳細は [PWA-IOS.md](./PWA-IOS.md) を参照してください。

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