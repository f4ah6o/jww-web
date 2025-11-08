# PWA & iOS ネイティブアプリ対応

このドキュメントでは、JWW ViewerのPWA（Progressive Web App）機能とiOSネイティブアプリ化について説明します。

## PWA機能

### 概要

JWW ViewerはPWAとして実装されており、以下の機能を提供します：

- **オフライン対応**: Service Workerによるキャッシング
- **インストール可能**: ホーム画面に追加可能
- **アプリライクなUI**: スタンドアロンモードでの動作
- **自動更新**: 新しいバージョンが利用可能になると自動的に通知

### PWAのインストール方法

#### デスクトップブラウザ（Chrome、Edge等）
1. アプリケーションをブラウザで開く
2. アドレスバーの右側にインストールアイコンが表示される
3. アイコンをクリックして「インストール」を選択

#### iOS（Safari）
1. Safariでアプリケーションを開く
2. 共有ボタン（四角に上向き矢印）をタップ
3. 「ホーム画面に追加」を選択
4. 「追加」をタップ

#### Android（Chrome）
1. Chromeでアプリケーションを開く
2. メニュー（三点リーダー）を開く
3. 「ホーム画面に追加」を選択
4. 「追加」をタップ

### オフライン機能

Service Workerにより、以下のリソースが自動的にキャッシュされます：

- アプリケーションの全JavaScriptファイル
- CSSスタイルシート
- HTMLファイル
- 画像ファイル
- フォントファイル

初回アクセス後は、オフラインでもアプリケーションが動作します。

## iOSネイティブアプリ化（Capacitor）

### 概要

Capacitorを使用して、WebアプリをiOSネイティブアプリに変換できます。

### 必要要件

- macOS
- Xcode 15以降
- CocoaPods（`sudo gem install cocoapods`）
- iOS Simulator または実機（テスト用）

### ビルド手順

#### 1. アプリケーションのビルド

```bash
npm run build
```

#### 2. iOSプロジェクトへの同期

```bash
npm run cap:sync
```

または、iOS専用のビルドとオープン：

```bash
npm run build:ios
```

#### 3. Xcodeでプロジェクトを開く

```bash
npm run cap:open:ios
```

または手動で：

```bash
open ios/App/App.xcworkspace
```

#### 4. Xcodeでの設定

1. **Signing & Capabilities**
   - Team を選択
   - Bundle Identifier を設定（例：`com.yourcompany.jwwviewer`）

2. **Deployment Info**
   - Minimum Deployments: iOS 13.0以降
   - デバイスの向き: Portrait

#### 5. ビルドと実行

Xcodeで：
1. ターゲットデバイスを選択（Simulator または実機）
2. ▶️ ボタンをクリックしてビルド＆実行

または、コマンドラインから：

```bash
npm run cap:run:ios
```

### iOS特有の機能

#### Safe Area対応

index.htmlで`viewport-fit=cover`を設定し、iOSのノッチやホームインジケーターに対応しています。

#### スタンドアロンモード

ホーム画面から起動すると、Safariのツールバーなしで全画面表示されます。

#### ネイティブ機能へのアクセス

Capacitorプラグインを追加することで、以下のネイティブ機能にアクセス可能：

- ファイルシステム
- カメラ
- 位置情報
- プッシュ通知
- など

プラグインの追加例：

```bash
npm install @capacitor/filesystem
npx cap sync
```

## 開発ワークフロー

### 開発モード

PWA機能を含めた開発モード：

```bash
npm run dev
```

開発モードでは、Service Workerも有効化されているため、PWA機能をローカルでテストできます。

### ビルドとデプロイ

#### Web（PWA）

```bash
npm run build
npm run preview  # ビルド結果をプレビュー
```

#### iOS

```bash
npm run build:ios  # ビルド、sync、Xcodeを開く
```

### 更新の同期

Webアプリに変更を加えた後、iOSアプリに反映：

```bash
npm run build
npm run cap:sync
```

## トラブルシューティング

### PWA関連

**Q: Service Workerが登録されない**
- HTTPSまたはlocalhostで実行していることを確認
- ブラウザの開発者ツールでエラーを確認

**Q: オフラインで動作しない**
- 初回は必ずオンラインでアクセスが必要
- Service Workerが正常に登録されているか確認

### iOS関連

**Q: Xcodeでビルドエラーが発生**
```bash
cd ios/App
pod install
```

**Q: CocoaPodsのエラー**
```bash
sudo gem install cocoapods
pod repo update
```

**Q: 実機でのビルドエラー**
- Apple Developer Programへの登録が必要
- Signing & Capabilitiesで正しいTeamを選択

## スクリプトリファレンス

| コマンド | 説明 |
|---------|------|
| `npm run build` | Webアプリをビルド |
| `npm run build:pwa` | PWAをビルドしてCapacitorに同期 |
| `npm run build:ios` | iOSアプリ用にビルド、同期、Xcodeを開く |
| `npm run cap:sync` | WebアプリをCapacitorプロジェクトに同期 |
| `npm run cap:open:ios` | XcodeでiOSプロジェクトを開く |
| `npm run cap:run:ios` | iOSシミュレータで実行 |

## ファイル構成

```
jww-web/
├── public/              # 静的ファイル
│   ├── pwa-192x192.png  # PWAアイコン（192x192）
│   ├── pwa-512x512.png  # PWAアイコン（512x512）
│   ├── apple-touch-icon.png  # iOSアイコン
│   └── robots.txt
├── src/
│   ├── main.tsx         # Service Worker登録
│   └── vite-env.d.ts    # 型定義
├── ios/                 # iOSネイティブプロジェクト（gitignore）
├── dist/                # ビルド出力（gitignore）
├── capacitor.config.ts  # Capacitor設定
└── vite.config.ts       # Vite + PWA設定
```

## リソース

- [Capacitor Documentation](https://capacitorjs.com/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)

## 次のステップ

1. **アイコンのカスタマイズ**: `public/`ディレクトリ内のPWAアイコンを独自のデザインに変更
2. **App Storeへの公開**: Apple Developer Programに登録し、App Store Connectで配布
3. **プッシュ通知**: `@capacitor/push-notifications`プラグインを追加
4. **ネイティブ機能の追加**: 必要に応じてCapacitorプラグインを追加
