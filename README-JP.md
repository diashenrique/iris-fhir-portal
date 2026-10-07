# IRIS FHIR Portal

[![CI](https://github.com/diashenrique/iris-fhir-portal/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/diashenrique/iris-fhir-portal/actions/workflows/ci.yml)

InterSystems IRIS for Health の FHIR サーバー上に構築した患者カルテです。FHIR REST、FHIR リソースの SQL ビュー、そして `Patient/$everything` でどこまでできるかを示します。InterSystems Developer Community の 4 本の記事と対になっています（[記事](#記事)を参照）。英語版は [README.md](README.md) です。

![患者カルテ](img/portal-chart.png)

## 前提条件

[git](https://git-scm.com/book/ja/v2/使い始める-Gitのインストール) と [Docker Desktop](https://www.docker.com/products/docker-desktop) をインストールしてください。

## インストール方法

任意のディレクトリにリポジトリをクローンします。

```
$ git clone https://github.com/diashenrique/iris-fhir-portal.git
```

このディレクトリでターミナルを開き、次を実行します。

```
$ docker compose up -d
```

イメージは `intersystems/irishealth-community:latest-cd`（InterSystems IRIS for Health 2026.2）をベースにしています。[sentai-task](https://github.com/musketeers-br/sentai-task) と同じリリースチャネルです。FHIR R4 サーバーは JsonAdvSQL ストレージ戦略を使うため、SQL スキーマは `HSFHIR_X0001_R` と `HSFHIR_X0001_S` です。

ポータルにはログインが必要です。http://localhost:32783/fhir/portal/diashenrique.fhir.portal.Home.cls を開き、ビルド時に作成されるデモユーザー `fhirportal` / `fhirportal`（ロールなし）でサインインしてください。1 つの IRIS セッションで、ページ、FHIR エンドポイント `/fhir/r4`、REST API `/fhir/api` が使えます。上部の Log out でセッションを終了します。このコンテナをマシンの外に公開しないでください。

## Docker インストールの確認

CI はプルリクエストと master への push のたびに、次のチェックを実行します。ローカルのコンテナに対して実行するには（Docker Compose 構成のみ。ポートを変更した場合は両方に `BASE_URL` を設定してください。既定値は `http://localhost:32783`）:

```
$ bash scripts/smoke.sh
```

このスクリプトはサインインし、FHIR サーバー、`/fhir/api` の REST ルート、両方のページを確認し、ログインなしやログアウト後には何も応答しないことを確かめます。`bash scripts/check-readonly.sh` は `/fhir/api` のロールが FHIR テーブルを読めても書けないことを、`bash scripts/check-readme-sql.sh` はドキュメントの SQL 例が動くことを確認します。ブラウザーテストには [Node.js](https://nodejs.org/) 22 以降が必要です。サインインして、一覧、カルテ、Edit、検査チャート、Timeline、言語、ログアウトを確認します。テストが作成・変更したデータは最後に削除または復元されます。

```
$ cd e2e
$ npm ci
$ npx playwright install chromium
$ npx playwright test
```

新しい Linux マシンでは、ブラウザーのシステムライブラリも入れるために `npx playwright install --with-deps chromium` を使ってください。

フロントエンドのライブラリは `vendor/` を通じて npm から取得します（[vendor/README.md](vendor/README.md) と [vendor/INVENTORY.md](vendor/INVENTORY.md) を参照）。CI は `fhirUI/assets/vendor` のファイルがロックファイルと一致することを確認し、`npm audit` を実行します。ローカルでは `cd vendor && npm ci --ignore-scripts && node sync.mjs --check` で同じ確認ができます。

## IPM によるインストール

ポータルには、JsonAdvSQL ストレージ戦略を使う FHIR R4 サーバーが `/fhir/r4` にある IRIS for Health が必要です。たとえば [iris-fhir-template](https://github.com/intersystems-community/iris-fhir-template) の `fhir-server` パッケージです。ポータルはそのサーバーのネームスペースに、サーバーの後でインストールします。

```
zn "FHIRSERVER"
zpm "install fhir-portal"
```

モジュール（バージョン 1.1.0 以降）は、`diashenrique.fhir.portal.Installer` を通じて Docker 構成と同じものを作成します。
- パスワードログイン付きの Web アプリケーション `/fhir/portal` と `/fhir/api`
- `/fhir/r4` と共有する 1 つのセッション
- ロール `FHIRPortalRead`（FHIR データベースの読み取り専用）と `FHIRPortalAPI`（エンドポイントの SQL スキーマへの SELECT と JSON SQL 関数の EXECUTE）

Docker イメージも同じモジュールでポータルをインストールします。

`http://your-server:port/fhir/portal/diashenrique.fhir.portal.Home.cls` を開き、IRIS ユーザーでサインインしてください。デモログイン `fhirportal` / `fhirportal` も作成するには、モジュールのパラメーターを渡します。IPM 0.10 では `-Dzpm.` 形式はモジュールに届きません。

```
zpm "install fhir-portal -DDemoUser=1"
```

`/fhir/r4` のないネームスペース（たとえば FHIR サーバーより前の `USER`）にインストールすると、モジュールは警告を表示するだけで何も設定しません。`zpm "uninstall fhir-portal"` は 2 つの Web アプリケーション、ロール、デモユーザーを削除します。`/fhir/r4` のセッション設定は残ります。

IRIS for Health 2026.2 では、`fhir-server` 1.3.7 は FHIRSERVER ネームスペースを自分で作成するときに失敗します。CI が使う回避策（先にネームスペースを作成し、IPM をマップする）は `scripts/ipm-install.sh` にあります。クリーンなコンテナ（ポート 42783）で IPM の経路全体を確認するには:

```
$ bash scripts/ipm-install.sh
$ BASE_URL=http://localhost:42783 bash scripts/smoke.sh
```

## ポータルが FHIR データを読む方法

ポータルは同じ FHIR データを 3 つの方法で読み、各カードはどの方法を使っているかを表示します。

- **[fhir.js](https://github.com/FHIR/fhir.js) による FHIR REST**（バッジ *FHIR · fhir.js*）: 患者一覧、サマリー、臨床カードは `/fhir/r4` を検索し、Edit は FHIR の `update` で患者を保存します。記事 1〜3 の内容です。
- **`/fhir/api` 経由の SQL**（バッジ *SQL · /fhir/api*）: 検査チャートです。REST クラス `diashenrique.fhir.portal.Dispatch` が、記事 4 の JSON 関数 `GetJSON`、`GetProp`、`GetAtJSON`（`src/User/SQLvar.cls`）を使って FHIR サーバーのテーブルに SQL を実行します。テーブル名は `/fhir/r4` のストレージ戦略から取得し、`/fhir/api` のロールは読み取りしかできません。
- **`Patient/$everything`**（バッジ *FHIR · $everything*）: Timeline です。1 回の呼び出しで取得します。

FHIR サーバーは JsonAdvSQL ストレージ戦略を使います。`HSFHIR_X0001_R.Rsrc` はすべてのリソースを JSON で保持し、`HSFHIR_X0001_S.<Resource>` はその検索パラメーターを保持します。以下は `/fhir/api` のクエリで、`?` パラメーターの代わりにサンプルの患者を使っています。

患者の検査項目（チャートの選択肢、`GET /fhir/api/laboptions/:id`）:

```sql
SELECT DISTINCT
  GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(r.ResourceString,'code'),'coding'),0),'code'),'code') AS testCode,
  GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(r.ResourceString,'code'),'coding'),0),'display'),'display') AS testName
FROM HSFHIR_X0001_S.Observation s
JOIN HSFHIR_X0001_R.Rsrc r ON r.Key = s.Key
WHERE s.patient_Reference = (SELECT TOP 1 patient_Reference FROM HSFHIR_X0001_S.Observation)
  AND r.ResourceType = 'Observation' AND r.Deleted = 0
  AND GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(r.ResourceString,'category'),'code'),0),'code'),'code') = 'laboratory'
ORDER BY testName
```

1 つの検査の結果（チャート、`GET /fhir/api/patient/:id/lab/:code`、ここでは LOINC 718-7、ヘモグロビン）:

```sql
SELECT
  GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(r.ResourceString,'code'),'coding'),0),'display'),'display') AS testName,
  GetProp(GetJSON(r.ResourceString,'effectiveDateTime'),'effectiveDateTime') AS effectiveDateTimeValue,
  GetProp(GetJSON(r.ResourceString,'valueQuantity'),'value') AS valueQuant
FROM HSFHIR_X0001_S.Observation s
JOIN HSFHIR_X0001_R.Rsrc r ON r.Key = s.Key
WHERE s.patient_Reference = (SELECT TOP 1 patient_Reference FROM HSFHIR_X0001_S.Observation)
  AND r.ResourceType = 'Observation' AND r.Deleted = 0
  AND GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(r.ResourceString,'category'),'code'),0),'code'),'code') = 'laboratory'
  AND GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(r.ResourceString,'code'),'coding'),0),'code'),'code') = '718-7'
ORDER BY effectiveDateTimeValue
```

記事 4 の段階的な例は [misc/sql/example.sql](misc/sql/example.sql) にあります。CI はこの README、英語版 README、そのファイルのすべての SQL 例を FHIR サーバーに対して実行します（`bash scripts/check-readme-sql.sh`）。

## ポータルの使い方

http://localhost:32783/fhir/portal/diashenrique.fhir.portal.Home.cls を開き、`fhirportal` / `fhirportal` でサインインします。

- **患者一覧:** 左側に、年齢、性別、FHIR ID とともに表示されます。名前か ID を入力して検索できます。`/` キーで検索欄に移動し、矢印キーで一覧を移動できます。
- **サマリー:** 患者を選ぶと、上部に患者の情報と、アレルギーの警告、アクティブな病態の数が表示されます。**Edit** は人口統計情報をモーダルで開き、FHIR の `update` で保存します（記事 3）。**FHIR JSON** は Patient リソースをそのまま表示します。SSN は **Reveal** を押すまでマスクされたままです。
- **臨床カード:** 常に開いており、それぞれ件数、データの取得元、読み込み中・空・エラーの状態を持ちます。Allergies、Conditions、Medications、Vital signs（各項目の最新値）、Laboratory（日付ごとにまとめ、基準範囲と High / Low の強調表示付き）、Immunizations、Encounters、Care plans です。

**検査チャート:** Laboratory カードで検査を選ぶと、その場でチャートが描かれます。単位と基準範囲も表示されます。値は `/fhir/api` 経由の SQL から取得します（記事 4）。

![Laboratory カード内の検査チャート](img/portal-lab-chart.png)

**Timeline:** **Timeline** タブは、患者の日付付きのすべてのイベント（受診、病態、処置、予防接種、処方、レポート）を年ごとに、`Patient/$everything` の 1 回の呼び出しで一覧表示します。種類で絞り込めます。

![Timeline](img/portal-timeline.png)

**Edit:**

![患者の編集](img/portal-edit.png)

**スマートフォン:** 一覧とカルテが交互に表示され、横スクロールは発生しません。

![スマートフォンでのカルテ](img/portal-mobile.png)

**Português:** ヘッダーの言語選択で、インターフェースをブラジルポルトガル語に切り替えられます。日付と数値も切り替わります。臨床データは FHIR サーバーが送るとおりに表示されます。現時点で日本語のインターフェースはありません。

![ポルトガル語のカルテ](img/portal-portuguese.png)

スクリーンショットは、コンテナの起動中に `cd e2e && node screenshots.js` で生成します。

## 記事

このポータルは 2020 年の FHIR コンテストのために作られ、InterSystems Developer Community の 4 本の記事（英語）で説明されています。

1. [My experience working with FHIR](https://community.intersystems.com/post/my-experience-working-fhir)
2. [Overview of iris-fhir-portal](https://community.intersystems.com/post/overview-iris-fhir-portal)
3. [Updating Patient resource using fhir.js](https://community.intersystems.com/post/updating-patient-resource-using-fhir-js)
4. [Getting FHIR information using SQL](https://community.intersystems.com/post/getting-fhir-information-using-sql)

記事は 2020 年のポータルを説明しています。その後、IRIS for Health 2026.2 と JsonAdvSQL スキーマ（`HSFHIR_X0001_*`）に移行し、ログイン、読み取り専用の `/fhir/api`、IPM モジュール、上記のレイアウトが加わりました。現在の SQL は[ポータルが FHIR データを読む方法](#ポータルが-fhir-データを読む方法)にあります。
