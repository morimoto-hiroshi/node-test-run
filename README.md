# GCP の node-test-run プロジェクトは shutdown しました。2023/11/26

# node-test-run

+ Googleでログイン、ブラウザからカメラやGPSなどを使うテスト

+ ブラウザのカメラは localhost または https でないと使えないので GCPに配置して使う。

+ GCS keyFileの取得は https://github.com/morimoto-hiroshi/node-gcs-cruds を参照。

## ローカルディレクトリの構築メモ

### node.js の設定

```
npm init
npm install websocket
npm install @google-cloud/storage
npm install @googleapis/docs
```

### GCP への配置

+ [GAEドキュメント - Node.jsランタイム > アプリの構築 > プロジェクトの作成](https://cloud.google.com/appengine/docs/standard/nodejs/building-app/creating-project?hl=ja)を参考に

+ プロジェクトを登録。
https://console.cloud.google.com/

+ ローカルで、
```
gcloud init
```

+ app.yaml を作成。
```
runtime: nodejs16
```

+ package.json ファイルに start スクリプトを追加。
```
"scripts": {
  "start": "node server.js"
}
```

+ サービスをデプロイする。
```
gcloud app deploy
```

+ リージョン参考
  + asia-northeast1　東京
  + asia-northeast2　大阪

+ アクセスURL
https://node-test-run.appspot.com/

### github アップロード

+ リモートリポジトリ作成
https://github.com/

+ ローカルリポジトリ初期化
```
git init
```

+ プロフィールを使い分ける
```
git config --local user.name "****************"
git config --local user.email "****************"
git config --local core.autocrlf true
git config --list --local
```

+ アップロード
```
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/morimoto-hiroshi/node-test-run.git
git push -u origin main
```
