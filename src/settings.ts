import { App, PluginSettingTab, Setting } from "obsidian";
import JapaneseNovelToolPlugin from "./main";

export type PaneAccentColor =
  | "accent"
  | "textAccent"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "cyan"
  | "blue"
  | "purple"
  | "pink";

/** 強調色として選べるObsidianのテーマ変数。いずれもテーマとライト/ダークに追従する。 */
export const PANE_ACCENT_COLORS: Record<PaneAccentColor, { label: string; variable: string }> = {
  accent: { label: "アクセント（既定）", variable: "--interactive-accent" },
  textAccent: { label: "リンク色", variable: "--text-accent" },
  red: { label: "赤", variable: "--color-red" },
  orange: { label: "オレンジ", variable: "--color-orange" },
  yellow: { label: "黄", variable: "--color-yellow" },
  green: { label: "緑", variable: "--color-green" },
  cyan: { label: "シアン", variable: "--color-cyan" },
  blue: { label: "青", variable: "--color-blue" },
  purple: { label: "紫", variable: "--color-purple" },
  pink: { label: "ピンク", variable: "--color-pink" }
};

export interface JapaneseNovelToolSettings {
  enableIndentation: boolean;
  showWhitespaceMarks: boolean;
  showLineBreakMarks: boolean;
  enableRubyRendering: boolean;
  enableKakuyomuEmphasis: boolean;
  rubySizeRatio: number;
  emphasisInsertFormat: "kakuyomu" | "aozora";
  emphasisMark: string;
  highlightActivePane: boolean;
  activePaneHighlightStyle: "outline" | "bar";
  activePaneAccentColor: PaneAccentColor;
  activePaneOutlineWidth: number;
  activePaneBarWidth: number;
  highlightOnlyWhenSplit: boolean;
  highlightActiveLine: boolean;
  enableCharacterCount: boolean;
  showHeadingCounts: boolean;
  countPrefix: string;
  countSuffix: string;
  excludeWhitespaceFromCount: boolean;
  excludeNewlinesFromCount: boolean;
  excludeRubyFromCount: boolean;
  excludeCalloutsFromCount: boolean;
  excludeCommentsFromCount: boolean;
  excludeHeadingsFromCount: boolean;
  excludeMarkdownControlsFromCount: boolean;
}

export const DEFAULT_SETTINGS: JapaneseNovelToolSettings = {
  enableIndentation: true,
  showWhitespaceMarks: false,
  showLineBreakMarks: false,
  enableRubyRendering: true,
  enableKakuyomuEmphasis: true,
  rubySizeRatio: 0.5,
  emphasisInsertFormat: "kakuyomu",
  emphasisMark: "﹅",
  highlightActivePane: true,
  activePaneHighlightStyle: "outline",
  activePaneAccentColor: "accent",
  activePaneOutlineWidth: 2,
  activePaneBarWidth: 4,
  highlightOnlyWhenSplit: true,
  highlightActiveLine: false,
  enableCharacterCount: true,
  showHeadingCounts: true,
  countPrefix: "",
  countSuffix: "文字",
  excludeWhitespaceFromCount: true,
  excludeNewlinesFromCount: true,
  excludeRubyFromCount: true,
  excludeCalloutsFromCount: true,
  excludeCommentsFromCount: true,
  excludeHeadingsFromCount: false,
  excludeMarkdownControlsFromCount: false
};

export class JapaneseNovelToolSettingTab extends PluginSettingTab {
  plugin: JapaneseNovelToolPlugin;

  constructor(app: App, plugin: JapaneseNovelToolPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("jnt-settings");

    new Setting(containerEl).setName("字下げ").setHeading();

    new Setting(containerEl)
      .setName("日本語の字下げを表示")
      .setDesc("行頭の全角スペースをReading viewで字下げとして表示します。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.enableIndentation)
        .onChange(async (value) => {
          this.plugin.settings.enableIndentation = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl).setName("可視化").setHeading();

    new Setting(containerEl)
      .setName("空白を可視化")
      .setDesc("エディタで全角スペース・タブにマークを表示します。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.showWhitespaceMarks)
        .onChange(async (value) => {
          this.plugin.settings.showWhitespaceMarks = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl)
      .setName("改行を可視化")
      .setDesc("エディタで行末に改行マーク（↵）を表示します。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.showLineBreakMarks)
        .onChange(async (value) => {
          this.plugin.settings.showLineBreakMarks = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl).setName("ルビ").setHeading();

    new Setting(containerEl)
      .setName("ルビと傍点を表示")
      .setDesc("｜本文《ルビ》、本文《ルビ》、｜本文《・》を表示用HTMLに変換します。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.enableRubyRendering)
        .onChange(async (value) => {
          this.plugin.settings.enableRubyRendering = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl)
      .setName("カクヨム形式の傍点")
      .setDesc("《《本文》》を傍点として表示します。ルビとは同時に解釈しません。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.enableKakuyomuEmphasis)
        .onChange(async (value) => {
          this.plugin.settings.enableKakuyomuEmphasis = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl)
      .setName("ルビサイズ比率")
      .setDesc("本文サイズに対するルビ文字サイズの比率です。デフォルトは 0.5 です。")
      .addText((text) => text
        .setPlaceholder("0.5")
        .setValue(String(this.plugin.settings.rubySizeRatio))
        .onChange(async (value) => {
          const parsed = Number.parseFloat(value);
          this.plugin.settings.rubySizeRatio = Number.isFinite(parsed)
            ? Math.min(1, Math.max(0.1, parsed))
            : 0.5;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl)
      .setName("傍点挿入形式")
      .setDesc("コマンドで選択範囲に傍点を挿入するときの形式です。")
      .addDropdown((dropdown) => dropdown
        .addOption("kakuyomu", "カクヨム: 《《本文》》")
        .addOption("aozora", "青空/なろう: ｜本文《﹅﹅》")
        .setValue(this.plugin.settings.emphasisInsertFormat)
        .onChange(async (value: "kakuyomu" | "aozora") => {
          this.plugin.settings.emphasisInsertFormat = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl)
      .setName("傍点文字")
      .setDesc("青空文庫・なろう形式で挿入する傍点の種類です。空の場合は ﹅ を使います。")
      .addText((text) => text
        .setPlaceholder("﹅")
        .setValue(this.plugin.settings.emphasisMark)
        .onChange(async (value) => {
          this.plugin.settings.emphasisMark = Array.from(value.trim())[0] ?? "﹅";
          await this.plugin.saveSettingsAndRefresh();
          this.display();
        }));

    new Setting(containerEl).setName("アクティブなペイン").setHeading();

    new Setting(containerEl)
      .setName("アクティブなペインを強調")
      .setDesc("編集対象のペインに枠線またはバーを表示します。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.highlightActivePane)
        .onChange(async (value) => {
          this.plugin.settings.highlightActivePane = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl)
      .setName("強調スタイル")
      .setDesc("ペイン全体を囲むか、左端のバーだけにするかを選びます。")
      .addDropdown((dropdown) => dropdown
        .addOption("outline", "枠線")
        .addOption("bar", "左端のバー")
        .setValue(this.plugin.settings.activePaneHighlightStyle)
        .onChange(async (value: "outline" | "bar") => {
          this.plugin.settings.activePaneHighlightStyle = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl)
      .setName("強調色")
      .setDesc("いずれもObsidianのテーマ変数です。テーマとライト/ダークに追従します。")
      .addDropdown((dropdown) => {
        for (const [value, { label }] of Object.entries(PANE_ACCENT_COLORS)) {
          dropdown.addOption(value, label);
        }
        dropdown
          .setValue(this.plugin.settings.activePaneAccentColor)
          .onChange(async (value: PaneAccentColor) => {
            this.plugin.settings.activePaneAccentColor = value;
            await this.plugin.saveSettingsAndRefresh();
          });
      });

    new Setting(containerEl)
      .setName("枠線の太さ")
      .setDesc("「枠線」スタイルのときの線の太さ（px）です。")
      .addSlider((slider) => slider
        .setLimits(1, 8, 1)
        .setDynamicTooltip()
        .setValue(this.plugin.settings.activePaneOutlineWidth)
        .onChange(async (value) => {
          this.plugin.settings.activePaneOutlineWidth = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl)
      .setName("左端のバーの太さ")
      .setDesc("「左端のバー」スタイルのときのバーの太さ（px）です。")
      .addSlider((slider) => slider
        .setLimits(1, 16, 1)
        .setDynamicTooltip()
        .setValue(this.plugin.settings.activePaneBarWidth)
        .onChange(async (value) => {
          this.plugin.settings.activePaneBarWidth = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl)
      .setName("カーソル行を強調")
      .setDesc("フォーカス中のエディタで、カーソルのある行に背景色を付けます。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.highlightActiveLine)
        .onChange(async (value) => {
          this.plugin.settings.highlightActiveLine = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl)
      .setName("分割しているときだけ強調")
      .setDesc("表示中のエディタが2つ以上のときだけ、上の強調を有効にします。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.highlightOnlyWhenSplit)
        .onChange(async (value) => {
          this.plugin.settings.highlightOnlyWhenSplit = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl).setName("文字数カウント").setHeading();

    new Setting(containerEl)
      .setName("文字数を表示")
      .setDesc("単語数ではなく、日本語小説向けの文字数をステータスバーに表示します。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.enableCharacterCount)
        .onChange(async (value) => {
          this.plugin.settings.enableCharacterCount = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl)
      .setName("接頭辞")
      .setDesc("ステータスバーの文字数の前に表示する文字列です。")
      .addText((text) => text
        .setPlaceholder("なし")
        .setValue(this.plugin.settings.countPrefix)
        .onChange(async (value) => {
          this.plugin.settings.countPrefix = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl)
      .setName("接尾辞")
      .setDesc("ステータスバーの文字数の後に表示する文字列です。")
      .addText((text) => text
        .setPlaceholder("文字")
        .setValue(this.plugin.settings.countSuffix)
        .onChange(async (value) => {
          this.plugin.settings.countSuffix = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl)
      .setName("見出し横にセクション文字数を表示")
      .setDesc("各見出しから、次の同じ階層以上の見出しまでを数えます。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.showHeadingCounts)
        .onChange(async (value) => {
          this.plugin.settings.showHeadingCounts = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl).setName("カウント対象").setHeading();

    this.addCountToggle("空白を数えない", "excludeWhitespaceFromCount");
    this.addCountToggle("改行を数えない", "excludeNewlinesFromCount");
    this.addCountToggle("ルビと傍点の記法を数えない", "excludeRubyFromCount");
    this.addCountToggle("ObsidianのCalloutを数えない", "excludeCalloutsFromCount");
    this.addCountToggle("Markdownコメントを数えない", "excludeCommentsFromCount");

    new Setting(containerEl)
      .setName("見出しを文字数から除外")
      .setDesc("# 見出し行全体を文字数に含めません。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.excludeHeadingsFromCount)
        .onChange(async (value) => {
          this.plugin.settings.excludeHeadingsFromCount = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    new Setting(containerEl)
      .setName("Markdown制御文字を除外")
      .setDesc("見出し記号、強調記号、リンク記法などをできるだけ本文だけにして数えます。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.excludeMarkdownControlsFromCount)
        .onChange(async (value) => {
          this.plugin.settings.excludeMarkdownControlsFromCount = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

  }

  private addCountToggle(name: string, key: keyof Pick<
    JapaneseNovelToolSettings,
    | "excludeWhitespaceFromCount"
    | "excludeNewlinesFromCount"
    | "excludeRubyFromCount"
    | "excludeCalloutsFromCount"
    | "excludeCommentsFromCount"
  >): void {
    new Setting(this.containerEl)
      .setName(name)
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings[key])
        .onChange(async (value) => {
          this.plugin.settings[key] = value;
          await this.plugin.saveSettingsAndRefresh();
        }));
  }
}
