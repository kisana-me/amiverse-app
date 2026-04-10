# OAuth PKCE Sign-in API Specification (Anyur -> Amiverse)

## 目的

Anyur の OAuth 認可コードを Amiverse API 側で安全に交換し、アプリ用アクセストークンを発行するための仕様を定義する。

この仕様は次を対象とする。

1. 認可画面リクエスト (Anyur Authorization Endpoint)
2. Amiverse 側のコード交換 API
3. セキュリティ要件 (必須)

## フロー概要

1. モバイルアプリが `code_verifier` と `state` を生成する。
2. アプリが `code_challenge=BASE64URL(SHA256(code_verifier))` を生成する。
3. アプリが Anyur 認可画面を開く。
4. Anyur が `amiverse://auth?code=...&state=...` へリダイレクトする。
5. アプリが `state` を検証し、Amiverse API へ `code` と `code_verifier` を送る。
6. Amiverse API が Anyur の token endpoint とサーバ間通信し、Amiverse セッション用トークンを返す。

## 1. Anyur 認可画面リクエスト仕様

Authorization Endpoint:

- `GET https://anyur.com/oauth/authorize`

必須クエリパラメータ:

1. `response_type`: `code` 固定
2. `client_id`: `Amiverse` 固定
3. `redirect_uri`: `amiverse://auth` 固定
4. `scope`: `persona_aid name name_id description birthdate subscription`
5. `state`: 32 文字以上のランダム文字列
6. `code_challenge`: `BASE64URL(SHA256(code_verifier))`
7. `code_challenge_method`: `S256` 固定

例:

https://anyur.com/oauth/authorize?response_type=code&client_id=Amiverse&redirect_uri=amiverse%3A%2F%2Fauth&scope=persona_aid+name+name_id+subscription&state=0jdetwgc3r8yqecy0qekwcmz&code_challenge=abc123...&code_challenge_method=S256

`code_verifier` 要件 (RFC 7636 準拠):

- 長さ: 43 から 128 文字
- 使用文字: `A-Z a-z 0-9 - . _ ~`
- 高エントロピー乱数で生成

## 2. Amiverse コード交換 API 仕様

正規エンドポイント:

- `POST https://api.amiverse.net/v1/sessions/create`

互換エンドポイント (非推奨・将来削除):

- `POST https://api.amiverse.net/app/signin`

### リクエスト

Headers:

1. `Content-Type: application/json`
2. `Accept: application/json`

Body (JSON):

1. `code` (required): Anyur から返された認可コード
2. `code_verifier` (required): 認可時に生成した verifier

例:

{
"code": "Q2xpZW50Q29kZQ",
"code_verifier": "J8fYtY3..."
}

互換運用:

- 旧クライアント互換のため、当面は `challenge` を `code_verifier` の別名として受理してよい。
- 新規クライアントは `code_verifier` のみを送る。

### 正常レスポンス

Status:

- `200 OK`

Body (JSON):

1. `status` (required): `success` または `error`
2. `access_token` (required when success): Amiverse API 用 Bearer token
3. `expires_in` (required when success): 有効秒数
4. `new_account` (optional): 初回サインインで自動作成された場合のみ `true`

例:

{
"status": "success",
"access_token": "amv_at_xxx",
"expires_in": 15778476,
"new_account": true
}

### エラーレスポンス

Status:

1. `400 Bad Request`: 必須パラメータ不足、形式不正
2. `401 Unauthorized`: クライアント認証失敗 (将来 confidential client 化した場合)
3. `409 Conflict`: 同一認可コードの再利用 (リプレイ)
4. `429 Too Many Requests`: レート制限超過
5. `500 Internal Server Error`: 想定外エラー
6. `502 Bad Gateway`: Anyur 側エラー、連携失敗

Body (JSON):

1. `status` (required): `error`
2. `error` (required): `invalid_request | invalid_grant | invalid_client | temporarily_unavailable | server_error`
3. `error_description` (required): 人間可読メッセージ
4. `trace_id` (required): 追跡 ID

例:

{
"status": "error",
"error": "invalid_grant",
"error_description": "authorization code is invalid or already used",
"trace_id": "d1c4c9b8-2f41-4a61-9228-1fd4b0d8f53f"
}

## 3. サーバ側必須バリデーション

1. `code` の形式と長さを検証すること。
2. `code_verifier` が RFC 7636 の文字種・長さ制約を満たすこと。
3. Anyur の token endpoint 交換時に `code_verifier` を必ず送ること。
4. サーバ側で `redirect_uri=amiverse://auth` と `client_id=Amiverse` を固定値として使用すること。
5. 認可コードを単回使用にし、再利用は `invalid_grant` または `409` とすること。
6. Anyur から受領した ID の同一性検証後に Amiverse トークンを発行すること。

## 4. セキュリティ要件 (甘くしないための最低ライン)

1. HTTPS 必須

- 平文 HTTP は禁止。
- TLS 1.2 以上を必須化。

2. PKCE 強制

- `code_challenge_method=plain` は不許可。
- `S256` のみ許可。

3. 認可コードの短寿命・単回使用

- 推奨 TTL は 60 秒から 180 秒。
- 使用済みコードは即失効。

4. 入力値の厳格検証

- `redirect_uri` 完全一致。
- `client_id` 完全一致。
- `code_verifier` 文字種と長さチェック。

5. トークン保護

- ログに `code`, `code_verifier`, `access_token`, `refresh_token` を出さない。
- 監査ログは `trace_id`, 結果コード, タイムスタンプ中心にする。

6. レート制限と不正検知

- IP / device / user 単位で制限。
- 短時間連続失敗で一時的に抑止。

7. リフレッシュトークン運用

- 長寿命化する場合はローテーションを必須化。
- 再利用検知時は当該セッションを失効。

8. アプリ側 state 検証

- callback の `state` は必ずローカル保存値と一致確認。
- 不一致は交換 API を呼ばずに失敗扱い。

## 5. 推奨期限

1. 互換エンドポイント (`/app/signin`) は最大 1 リリース周期で廃止。
2. 新実装は `code_verifier` フィールドのみを使用。
3. 廃止前に API レスポンスヘッダで deprecation 通知を出す。
