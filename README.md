# Japanese Novel Tool

An Obsidian plugin for writing novels in Japanese. It renders Japanese paragraph
indentation correctly, displays ruby (furigana) and emphasis dots written in the
Kakuyomu / Aozora Bunko / Narou notations, and counts characters the way Japanese
prose is usually counted.

**日本語のドキュメントは [こちら](#日本語) にあります。**

## Features

- Correct display of Japanese indentation written with a leading full-width space
- Optional visualization of whitespace and line breaks in the editor
- Ruby (furigana) and emphasis dots, rendered in both Reading view and Live Preview
- Commands to insert and remove ruby and emphasis markup
- Copy the heading section under the cursor to the clipboard
- Character counting tuned for Japanese prose, in the status bar and next to headings

## Installation

### Manual installation

1. Create `.obsidian/plugins/japanese-novel-tool/` inside your vault.
2. Download `main.js`, `manifest.json`, and `styles.css` from the
   [latest release](https://github.com/nonkuri/japanese-novel-tool/releases/latest)
   and place them in that folder.
3. Reload Obsidian, then enable **Japanese Novel Tool** under
   Settings → Community plugins.

Once the plugin is listed in the community plugin directory, you will also be able
to install it from Settings → Community plugins → Browse.

## Usage

### Indentation

Japanese paragraphs are indented with a full-width space (`　`) at the start of the
line. Obsidian's default wrapping misaligns the lines that follow; this plugin
adjusts the display so the indentation stays consistent in Reading view as well as
in Live Preview and Source mode.

### Ruby (furigana)

```markdown
漢字《かんじ》
｜任意の本文《にんいのほんぶん》
|半角パイプも使用可能《はんかくぱいぷもしようかのう》
```

The `漢字《かんじ》` form can be used when the base text consists only of kanji. When
the base text contains kana or symbols, mark its range explicitly with `｜` or `|`.

### Emphasis dots

Aozora Bunko / Narou style, which is really ruby:

```markdown
｜重要《﹅﹅》
```

Kakuyomu style, rendered with `text-emphasis`:

```markdown
《《重要》》
```

### Commands

| Command | Description |
| --- | --- |
| `Insert ruby` | Wraps the selection as `｜selection《》`. With no selection, inserts `｜《》`. |
| `Insert emphasis marks` | Adds emphasis markup to the selection, in the format chosen in the settings. |
| `Remove ruby and emphasis marks from selection` | Strips ruby and emphasis markup from the selection, leaving the base text. |
| `Copy current section (with heading)` | Copies the heading section the cursor is in, including the heading line, to the clipboard. Nested sub-sections are included. |
| `Copy current section (without heading)` | The same, but excludes the heading line itself. |

In a file with no headings, both copy commands copy the whole document. If the file
has headings but the cursor sits before the first one, the text from the beginning
of the file up to that heading is copied.

### Character count

Characters are counted rather than words. The count is shown in the status bar, and
optionally next to each heading for the section it introduces. By default whitespace,
line breaks, ruby and emphasis control characters, Obsidian callouts, and Markdown
comments are excluded from the count.

## Settings

The settings tab is grouped into four sections:

- **Indentation** — turn the indentation display on or off
- **Visualization** — show marks for full-width spaces, tabs, and line breaks
- **Ruby** — enable ruby and emphasis rendering, choose the Kakuyomu emphasis form,
  set the ruby size ratio, and pick the format and character used when inserting
  emphasis dots
- **Character count** — enable the status bar and per-heading counts, set a prefix
  and suffix, and choose what is excluded from the count

The Japanese section below documents every option with its default value.

## Privacy

This plugin makes no network requests. It reads notes only through the Obsidian API
in order to count characters and render markup, and it stores nothing but its own
settings. The two "Copy current section" commands write to the system clipboard when
you run them; the plugin never reads the clipboard.

## License

[MIT](LICENSE)

---

# 日本語

Obsidianで日本語小説を書くための補助プラグインです。

次の機能をまとめて提供します。

- 日本語の行頭全角空白による字下げを適切に表示
- 空白と改行の可視化（オプション）
- カクヨム/青空文庫/小説家になろう系のルビと傍点表示
- ルビと傍点の挿入コマンド
- 見出しセクション単位のクリップボードコピー
- 日本語小説向けの文字数カウント

## インストール

1. Vault内に `.obsidian/plugins/japanese-novel-tool/` を作成します。
2. `main.js`、`manifest.json`、`styles.css` をそのフォルダに配置します。
3. Obsidianを起動し、コミュニティプラグインから `Japanese Novel Tool` を有効にします。

## 使い方

### 字下げ

行頭に全角スペースを入れた日本語の字下げを、できるだけ正しく表示します。
Live Preview / Source modeでは、Obsidian標準の折り返し字下げによるずれを抑えるCSSを適用します。

### 空白と改行の可視化

エディタ（Live Preview / Source mode）で、空白と改行を薄い色のマークとして表示できます。どちらも既定ではオフです。

- 全角スペース: `□`
- タブ: `→`
- 改行: 行末に `↵`（禁則処理と同様にぶら下げ表示され、マークだけが次の行へ送られることはありません）

### ルビ

次の書式のルビをレンダリングして表示します。

```markdown
漢字《かんじ》
｜任意の本文《にんいのほんぶん》
|半角パイプも使用可能《はんかくぱいぷもしようかのう》
```

`漢字《かんじ》` 形式は、ルビ対象が漢字のみで構成される場合に使えます。ひらがなや記号を含む語句にルビを振る場合は、`｜` または `|` で対象範囲を明示してください。

### 傍点

青空文庫・小説家になろう系の傍点（実体はルビ）:

```markdown
｜重要《﹅﹅》
```

カクヨム形式の傍点（text-emphasis）:

```markdown
《《重要》》
```

ルビと傍点は同時には適用しません。

## コマンド

Obsidianのコマンドパレットから次のコマンドを使えます。

| コマンド                                            | 内容                                        |
| ----------------------------------------------- | ----------------------------------------- |
| `Insert ruby`                                   | 選択範囲を `｜選択範囲《》` で囲みます。未選択時は `｜《》` を挿入します。 |
| `Insert emphasis marks`                         | 設定した形式で選択範囲に傍点記法を挿入します。                   |
| `Remove ruby and emphasis marks from selection` | 選択範囲からルビ/傍点記法を取り除き、本文だけにします。              |
| `Copy current section (with heading)`           | カーソルが属する見出しセクションを、見出し行を含めてクリップボードにコピーします。配下の小見出しも含みます。 |
| `Copy current section (without heading)`        | 同上ですが、カーソルが属する見出し行だけを除いてコピーします。配下の小見出しは含みます。 |

見出しセクションのコピーは、カーソル位置に応じて対象が変わります。

- 見出しが1つもないファイルでは、どちらのコマンドでも**全文**をコピーします。
- 見出しはあるが、カーソルが最初の見出しより前（前文）にある場合は、**先頭から最初の見出しの直前まで**をコピーします。

## 設定

設定画面は次の4グループに分かれています。

### 字下げ

| 設定         | 既定値 | 説明                        |
| ---------- | --- | ------------------------- |
| 日本語の字下げを表示 | オン  | 行頭の全角スペースによる字下げを適切に表示します。 |

### 可視化

| 設定     | 既定値 | 説明                                  |
| ------ | --- | ----------------------------------- |
| 空白を可視化 | オフ  | エディタで全角スペース・タブにマークを表示します。           |
| 改行を可視化 | オフ  | エディタで行末に改行マーク（↵）を表示します。             |

### ルビ

| 設定        | 既定値   | 説明                                              |
| --------- | ----- | ----------------------------------------------- |
| ルビと傍点を表示  | オン    | ルビと傍点記法を表示用HTML/Decorationへ変換します。               |
| カクヨム形式の傍点 | オン    | `《《本文》》` を傍点として扱います。                            |
| ルビサイズ比率   | `0.5` | 本文サイズに対するルビ文字サイズの比率です。指定できる範囲は `0.1` から `1` です。 |
| 傍点挿入形式    | カクヨム  | `Insert emphasis marks` で使う挿入形式です。              |
| 傍点文字      | `﹅`   | 青空文庫・なろう形式で挿入する傍点文字です。                          |

青空文庫・なろう形式で傍点を挿入する場合、傍点文字は対象となる文字の数だけ繰り返されます。

例:

```markdown
｜重要《﹅﹅》
```

### 文字数カウント

| 設定                    | 既定値  | 説明                                  |
| --------------------- | ---- | ----------------------------------- |
| 文字数を表示                | オン   | ステータスバーに文字数を表示します。                  |
| 接頭辞                   | 空    | ステータスバーの文字数の前に表示する文字列です。            |
| 接尾辞                   | `文字` | ステータスバーの文字数の後に表示する文字列です。            |
| 見出し横にセクション文字数を表示      | オン   | 各見出しから次の同じ階層以上の見出しまでを数え、見出し横に表示します。 |
| 空白を数えない               | オン   | 空白を文字数から除外します。                      |
| 改行を数えない               | オン   | 改行を文字数から除外します。                      |
| ルビと傍点の記法を数えない         | オン   | ルビや傍点の制御文字を除外し、本文部分を数えます。           |
| ObsidianのCalloutを数えない | オン   | Calloutブロックを文字数から除外します。             |
| Markdownコメントを数えない     | オン   | `%% コメント %%` を文字数から除外します。           |
| 見出しを文字数から除外           | オフ   | 見出し行を文字数から除外します。                    |
| Markdown制御文字を除外       | オフ   | 見出し記号、強調記号、リンク記法などを表示に近い形で数えます。     |

## 文字数カウントの仕様

文字数カウントは日本語小説向けに、単語数ではなく文字数を数えます。

既定では次を数えません。

- 空白
- 改行
- ルビ/傍点の制御文字
- Obsidian Callout
- Markdownコメント

見出し横のセクション文字数は、次の同じ階層または上位階層の見出しまでを対象にします。

```markdown
# 第一章

## 一

本文...

## 二

本文...
```

この場合、`## 一` は次の `## 二` まで、`# 第一章` は章全体を数えます。

## 注意事項

- 見出し構造を大きく変更した直後は、表示更新まで少し遅れることがあります。
- コピペや置換など複雑な編集では、正確性を優先して見出しカウントを再構築します。
- ルビ入力中の行は、入力の軽さを優先して一時的に装飾を外します。カーソルを移動すると再表示されます。
- 字下げ表示はObsidianのMarkdownレンダリング結果に依存します。行頭の全角スペースだけを編集した直後は、ノートを開き直すと反映されやすい場合があります。

## 参考にしたプラグイン

- [Jisage](https://github.com/Telehakke/jisage-japanese-indentation)
- [Japanese Novel Ruby](https://github.com/k-quels/japanese-novel-ruby)
- [Better Word Count](https://github.com/lukeleppan/better-word-count)



## 免責事項

本プラグインは現状のまま提供されます。作者は、本プラグインの使用または使用不能によって生じたいかなる損害についても責任を負いません。

本プラグインの動作について正確性や完全性を保証するものではありません。利用者の責任においてご使用ください。

本プラグインは予告なく仕様変更、更新、公開停止される場合があります。


## ライセンス

[MIT License](LICENSE)


## 変更履歴

### [0.1.8] - 2026-08-18

- コミュニティプラグインの自動レビューの指摘に対応（挙動の変更なし）
  - DOM生成をObsidianの `createSpan` / `createEl` / `createFragment` に統一
  - ビルド設定の `builtin-modules` 依存を Node 標準の `node:module` に置き換え
  - 正規表現内の全角スペースをエスケープ表記に変更、不要なエスケープを削除
  - 設定の読み込みに型を付与、未使用の定数を削除

### [0.1.7] - 2026-08-18

- READMEに英語のドキュメント（機能概要・インストール・使い方・設定・プライバシー）を追加

### [0.1.6] - 2026-08-18

- Obsidianコミュニティプラグイン申請に向けてリポジトリを整備
  - MITライセンスの `LICENSE` を追加
  - 設定画面の見出しをObsidian標準の見出し表示に変更
  - プラグインを無効化したときにルビサイズ用のCSS変数を後始末するよう修正

### [0.1.5] - 2026-08-10

- 行末の改行マーク（↵）を禁則処理のぶら下げ表示に変更
  - 行が右端まで埋まったときに、改行マークだけが次の行へ折り返されてしまう問題を修正

### [0.1.4] - 2026-06-25

- 見出しセクションのコピーコマンドの対象範囲を拡張
  - 見出しが1つもないファイルでは全文をコピー
  - カーソルが最初の見出しより前（前文）にある場合は、先頭から最初の見出しの直前までをコピー

### [0.1.3] - 2026-06-23

- カーソルが属する見出しセクションをクリップボードにコピーするコマンドを追加
  - `Copy current section (with heading)`（見出し行を含む）
  - `Copy current section (without heading)`（見出し行を除く）
  - いずれも配下の小見出しを含めてコピーします

### [0.1.2] - 2026-06-10

- 空白（全角スペース・タブ）と改行を可視化する機能を追加（それぞれ設定でオン/オフ可能、既定はオフ）

### [0.1.1] - 2026-06-10

- 長文ファイルでの動作速度を改善
  - ルビ/傍点の解析処理を書き換え、文字数カウントを大幅に高速化
  - 編集中のキー入力ごとに全文を再解析していた見出しカウント処理を、変更行のみの差分処理に変更
  - ファイルを開く・ペインを切り替えるたびに全エディタの表示を再構築していた処理を軽量化
- 複数行テキストの行頭にあるルビで、直前のテキストが文字数カウントやプレビューから失われる不具合を修正

### [0.1.0] - 2026-06-09

- Initial release
