# Drawing Feature Architecture

## 背景
投稿フォーム内に混在していたお絵描きの描画ロジックを、再利用可能な feature として分離した。
目的は以下の 3 点。

1. 画面コンポーネント (`features/post/form.tsx`) を軽く保つ
2. 描画フォーマット（packed）と描画表示（Skia）を単一責務で管理する
3. 将来的に描画関連 UI を他画面でも再利用しやすくする

## 設計原則

1. Feature boundary を明確化する
- `features/drawing/` を描画ドメインの境界とし、外部利用は原則 `features/drawing/index.ts` 経由にする。

2. UI とロジックを分離する
- UI コンポーネントは `features/drawing/components/`。
- 変換や描画ユーティリティは `features/drawing/lib/`。
- 共有定数は `features/drawing/constants.ts`。
- 共有型は `features/drawing/types.ts`。

3. ローワースネークケース命名を徹底する
- `editor.tsx`
- `viewer.tsx`
- `packed_codec.ts`
- `skia_image.ts`

4. 互換性よりも最終的な依存一本化を優先する
- 旧 `components/post/DrawingEditor.tsx` は削除済み。
- 利用側は `@/features/drawing` へ統一。

5. 表示品質を仕様として固定する
- DrawingViewer は `FilterMode.Nearest` と `MipmapMode.None` を使い、ドット表示のにじみを防ぐ。

## 現在の構成

```
features/drawing/
  constants.ts
  index.ts
  types.ts
  components/
    editor.tsx
    viewer.tsx
  lib/
    packed_codec.ts
    skia_image.ts
```

## 各ファイルの責務

1. `features/drawing/components/editor.tsx`
- お絵描き編集 UI 本体。
- ツール切替、履歴管理、ズーム/パン、保存を担当。
- packed 変換や Skia 画像生成は `lib` を利用する。

2. `features/drawing/components/viewer.tsx`
- packed データを受け取り、プレビュー表示のみを担当。
- `DrawingViewer` として公開。

3. `features/drawing/lib/packed_codec.ts`
- packed <-> bitmap 変換。
- base64 encode/decode の責務を集約。

4. `features/drawing/lib/skia_image.ts`
- bitmap または packed から Skia image を生成。

5. `features/drawing/types.ts`
- `DrawingDraft`, `DrawingEditorProps`, `DrawingViewerProps` などの共通型。

6. `features/drawing/index.ts`
- 外部公開 API。
- `DrawingEditor`, `DrawingViewer`, 必要定数・型を再エクスポート。

## 利用側の意図

1. `features/post/form.tsx`
- `DrawingEditor` をモーダル編集に使用。
- `DrawingViewer` を添付プレビューに使用。
- フォームは投稿フローに集中し、描画ロジックの詳細を持たない。

## 命名方針

1. ファイル名は lower_snake_case。
2. React コンポーネント名は PascalCase。
3. コンポーネント公開名はドメイン接頭辞を付ける。
- 例: `DrawingEditor`, `DrawingViewer`

## 今後の拡張ガイド

1. packed 以外の表示形式を追加する場合
- `viewer.tsx` へ分岐を増やさず、別コンポーネントを `components/` に追加する。

2. 新しい変換処理を追加する場合
- `editor.tsx` に直接書かず、`lib/` に追加して共有する。

3. 外部公開を増やす場合
- まず `index.ts` に公開すべきか検討し、内部専用なら export しない。

## 非目標

1. Drawing feature で投稿 API やフォーム状態管理を持たない。
2. Editor と Viewer を 1 ファイルへ統合しない。
3. 画面固有 UI（投稿ボタン、公開範囲など）を drawing feature に入れない。

## まとめ

今回の feature 化で、描画ドメインは「編集」「表示」「変換」「公開境界」が明確になった。
`features/post/form.tsx` はユースケース実装に専念し、描画機能は `features/drawing` に委譲する構造になっている。
