# QuickPanel PWA

iPhone Safari / ホーム画面で使う、自分専用のクイックランチャー。

## 技術構成
- React 19 + TypeScript + Vite
- PWA: Web App Manifest + Service Worker
- 保存先: localStorage（端末内）
- 外部API・サーバー・有料サービス不要

## 開発
```bash
npm install
npm run dev
npm run build
npm run preview
```

## iPhoneへの追加
1. HTTPSで公開する（Vercel / GitHub Pages等）。
2. iPhoneのSafariで公開URLを開く。
3. 共有ボタン →「ホーム画面に追加」。
4. 「Webアプリとして開く」を有効にして追加。

## 現在の機能
- 1×1 / 2×1 / 2×2 タイル
- タイル追加・編集・複製・削除
- 編集モードでドラッグ＆ドロップ並べ替え
- アプリURLスキーム / Universal Link / Webサイト起動
- ショートカット名によるiOSショートカット起動
- メモのコピー、ワークフロー（URL起動・ショートカット・コピー・通知・待機）
- 端末内保存、JSONバックアップ・復元
- Service Workerによるアプリシェルのオフラインキャッシュ
- iPhoneのSafe Area・ホーム画面表示に対応

## iOS / PWAの制約
- PWAはiOSのネイティブアプリ拡張を持てないため、Swift版のLockedCameraCaptureExtensionやカメラコントロール専用起動は実装できない。
- Wi-Fi / Bluetooth / 集中モード等のシステム設定を直接切り替える公開Web APIはない。必要な場合はショートカットを経由する。
- アプリの起動先URLスキームは、対象アプリ側がそのスキームを登録している場合のみ動作する。
- カメラタイルはiOSのファイル選択・撮影UIを呼び出す。常時カメラ制御ではない。
- オフライン時はアプリ本体を開けるが、外部アプリ・Webサイトの起動には通信が必要な場合がある。

## データについて
設定はブラウザ/PWAの保存領域に保持される。Safariタブとホーム画面アプリでは保存領域が分かれることがあるため、必要に応じてJSONバックアップを利用する。
