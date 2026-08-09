# CLAUDE.md

Obsidian 用の日本語小説執筆補助プラグイン。字下げ表示、ルビ・傍点のレンダリング、文字数カウントを提供する。

## 構成

| パス | 役割 |
| --- | --- |
| `src/main.ts` | プラグイン本体。CodeMirror の ViewPlugin / Decoration、Reading view の後処理、コマンド登録 |
| `src/parser.ts` | ルビ・傍点記法（`｜漢字《ふりがな》` / `《《傍点》》`）の解析 |
| `src/count.ts` | 文字数カウントと見出しセクションの範囲計算 |
| `src/settings.ts` | 設定の型・既定値・設定タブ |
| `styles.css` | エディタ / プレビュー両方のスタイル |
| `main.js` | esbuild の出力。**リポジトリにコミットする**（Obsidian プラグインの配布物のため） |

## コマンド

```bash
npm run build   # tsc の型チェック + esbuild の production ビルド
npm run dev     # watch ビルド
```

ビルドすると `main.js` が更新される。CSS のみの変更なら `main.js` は変わらない。

## 実装上の注意

- エディタの装飾は CodeMirror 6 の Decoration で行う。空白マークとルビ表示は同じ範囲に重ねると要素が分割されてルビが崩れるため、ルビ記法の範囲は空白マークから除外している（`src/main.ts` の `buildInvisibleDecorations`）
- 行末の改行マーク（`↵`）は widget として挿入するが、通常の文字として扱うと行が右端まで埋まったときにマークだけ折り返される。`styles.css` の `.jnt-line-break-mark` を幅ゼロの `inline-block` にしてぶら下げ表示にすることで回避している
- 長文ファイルの性能に配慮する。文字数カウントや見出しカウントは全文の再解析を避け、差分・キャッシュで処理している

## リリース手順

1. バージョンを 3 ファイルで揃えて上げる
   - `manifest.json` の `version`
   - `package.json` の `version`
   - `versions.json` に `"<version>": "1.5.0"` を追記（値は `minAppVersion`）
2. **`README.md` の「変更履歴」に新バージョンの項目を追加する。**挙動が変わった場合は機能説明の記述も更新する
3. `npm run build`
4. `main` ブランチに直接コミットする（タグがリリース対象のコミットを指す必要があるため、ブランチは切らない）。1〜3 の変更は同じコミットにまとめる
5. タグを打って push する

   ```bash
   git tag <version> && git push origin main && git push origin <version>
   ```

6. リリースを作成する。添付は必ず `main.js` / `manifest.json` / `styles.css` の 3 ファイル

   ```bash
   gh release create <version> main.js manifest.json styles.css --title "<version>" --notes-file -
   ```

リリースノートは日本語で、「変更点」と「インストール」の見出し構成にする。インストールの案内は 3 ファイルを `.obsidian/plugins/japanese-novel-tool/` に配置する旨を書く。過去のリリースの本文を踏襲すること。
