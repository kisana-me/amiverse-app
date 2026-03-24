# Feature Design Guidelines

## 目的

このドキュメントは、新しい feature を追加する際に判断を揃えるための共通ガイド。
画面の都合でコードを置くのではなく、ドメイン境界に沿って設計することを目的とする。

## 基本方針

1. Feature First

- まず「何の機能か」でディレクトリを切る。
- 画面単位・コンポーネント単位より先に、ドメイン境界を決める。

2. 依存方向を単純化

- `app` / `components` は `features` を使ってよい。
- `features` 同士の直接依存は必要最小限。
- 共通処理は `lib` または feature 内の `lib` に寄せる。

3. 公開面の制御

- 外部利用は原則 `features/<feature>/index.ts` 経由。
- 内部実装（変換関数・補助関数）を無制限に export しない。

4. UI とロジックの分離

- UI: `features/<feature>/components`
- ロジック: `features/<feature>/lib` または `actions`
- 型: `features/<feature>/types.ts`
- 定数: `features/<feature>/constants.ts`

5. 小さく作って拡張

- 最初から過分割しない。
- 重複が見えたタイミングで分離する。

## 推奨ディレクトリテンプレート

```
features/<feature>/
  index.ts
  types.ts
  constants.ts
  components/
  actions/
  lib/
```

注: すべて必須ではない。必要なものだけ作る。

## 命名規約

1. ファイル名

- lower_snake_case で統一。
- 例: `post_form.tsx`, `drawing_viewer.tsx`, `packed_codec.ts`

2. コンポーネント名

- PascalCase。
- ドメイン接頭辞を推奨。
- 例: `DrawingEditor`, `DrawingViewer`, `PostForm`

3. 型名

- PascalCase + `Props`, `Payload`, `State` など役割語尾。

4. 関数名

- 動詞始まりで副作用を明示。
- 例: `submit_post`, `pick_media`, `build_post_form_data`（内部関数ならプロジェクトの既存スタイルに合わせる）

## 責務分割の目安

1. components

- 表示とイベント発火に集中。
- API通信や重い変換処理を直接持たない。

2. actions

- ユースケース単位の副作用。
- API呼び出し、フォーム送信、権限確認など。

3. lib

- 純粋関数中心。
- 入出力が明確で再利用しやすい処理。

4. providers

- 複数画面で共有する状態管理。
- 一つの feature 内だけで閉じる状態はまず local state を優先。

## 追加時チェックリスト

1. 境界

- このコードは本当にこの feature に属するか。

2. import

- 外部からの参照は barrel (`index.ts`) 経由か。

3. 重複

- 既存の `lib` / `actions` と同等処理がないか。

4. 命名

- lower_snake_case と PascalCase のルールに合っているか。

5. テスト/検証

- 主要フローの動作確認手順を PR に書けるか。

6. 移行

- 既存パスを壊す場合、段階移行か一括移行かを決めたか。

## よくあるアンチパターン

1. Feature を作ったのに `components` 直下にロジックが戻る
2. `index.ts` を介さず深い相対 import が増える
3. 型だけ別 feature へ散らばる
4. 1ファイルに UI・API・変換・状態が同居する
5. 過剰抽象化でファイル数だけ増える

## 推奨ワークフロー

1. 先に最小実装で機能を通す
2. 重複と境界違反を観測して分割
3. barrel を整える
4. import を統一
5. 使われなくなった旧ファイルを削除

## ドキュメント運用

1. 新 feature 追加時はこのガイドとの乖離を確認する
2. 乖離が合理的なら、理由を feature 個別ドキュメントに残す
3. 実運用で不要なルールは削除し、守られているルールだけを維持する
