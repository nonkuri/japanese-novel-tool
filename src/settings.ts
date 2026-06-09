import { App, PluginSettingTab, Setting } from "obsidian";
import JapaneseNovelToolPlugin from "./main";

export interface JapaneseNovelToolSettings {
  enableIndentation: boolean;
  enableRubyRendering: boolean;
  enableKakuyomuEmphasis: boolean;
  rubySizeRatio: number;
  emphasisInsertFormat: "kakuyomu" | "aozora";
  emphasisMark: string;
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
  enableRubyRendering: true,
  enableKakuyomuEmphasis: true,
  rubySizeRatio: 0.5,
  emphasisInsertFormat: "kakuyomu",
  emphasisMark: "﹅",
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

    containerEl.createEl("h2", { text: "字下げ" });

    new Setting(containerEl)
      .setName("日本語の字下げを表示")
      .setDesc("行頭の全角スペースをReading viewで字下げとして表示します。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.enableIndentation)
        .onChange(async (value) => {
          this.plugin.settings.enableIndentation = value;
          await this.plugin.saveSettingsAndRefresh();
        }));

    containerEl.createEl("h2", { text: "ルビ" });

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

    containerEl.createEl("h2", { text: "文字数カウント" });

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

    containerEl.createEl("h3", { text: "カウント対象" });

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
