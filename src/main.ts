import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import { Editor, MarkdownPostProcessorContext, MarkdownView, Plugin, TFile } from "obsidian";
import {
  CountOptions,
  countNovelCharacters,
  formatCount,
  getHeadingAncestorsFromHeadings,
  getHeadingSections,
  HeadingSection
} from "./count";
import { KAKUYOMU_EMPHASIS_REGEXP, NOVEL_RUBY_REGEXP, parseNovelMarkup, removeNovelMarkup } from "./parser";
import {
  DEFAULT_SETTINGS,
  JapaneseNovelToolSettings,
  JapaneseNovelToolSettingTab
} from "./settings";

export default class JapaneseNovelToolPlugin extends Plugin {
  settings: JapaneseNovelToolSettings;
  private statusBarItem!: HTMLElement;
  private headingSectionCache = new Map<string, { mtime: number; sections: HeadingSection[] }>();
  private characterCountTimer: number | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.applyStyleSettings();
    this.statusBarItem = this.addStatusBarItem();
    this.addSettingTab(new JapaneseNovelToolSettingTab(this.app, this));
    this.registerEditorExtension(this.createHeadingCountExtension());
    this.registerEditorExtension(this.createRubyExtension());

    this.registerMarkdownPostProcessor((el, ctx) => {
      if (this.settings.enableRubyRendering) {
        renderNovelMarkup(el, this.settings.enableKakuyomuEmphasis);
      }
      if (this.settings.enableIndentation) {
        renderJapaneseIndentation(el, ctx, this.app.workspace.activeEditor?.editor);
      }
      void this.decorateReadingView(el, ctx);
    });

    this.addCommand({
      id: "insert-japanese-novel-ruby",
      name: "Insert ruby",
      editorCallback: (editor) => insertRuby(editor)
    });

    this.addCommand({
      id: "insert-japanese-novel-emphasis",
      name: "Insert emphasis marks",
      editorCallback: (editor) => insertEmphasis(editor, this.settings.emphasisInsertFormat, this.settings.emphasisMark)
    });

    this.addCommand({
      id: "remove-japanese-novel-markup",
      name: "Remove ruby and emphasis marks from selection",
      editorCallback: (editor) => removeMarkupFromSelection(editor, this.settings.enableKakuyomuEmphasis)
    });

    // file-open / active-leaf-change ではステータスバーの更新だけで足りる。
    // refreshDisplays(updateOptions による全エディタ拡張の再構成)は設定変更時のみ。
    this.registerEvent(this.app.workspace.on("file-open", () => this.updateCharacterCount()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.updateCharacterCount()));
    this.registerEvent(this.app.workspace.on("editor-change", () => this.scheduleCharacterCountUpdate()));
    await this.refreshDisplays();
  }

  onunload(): void {
    if (this.characterCountTimer !== null) {
      window.clearTimeout(this.characterCountTimer);
      this.characterCountTimer = null;
    }
    this.clearReadingViewCounts();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettingsAndRefresh(): Promise<void> {
    await this.saveData(this.settings);
    this.applyStyleSettings();
    await this.refreshDisplays();
  }

  private applyStyleSettings(): void {
    const ratio = Number.isFinite(this.settings.rubySizeRatio)
      ? Math.min(1, Math.max(0.1, this.settings.rubySizeRatio))
      : 0.5;
    document.body.style.setProperty("--jnt-ruby-size", `${ratio}em`);
  }

  private async refreshDisplays(): Promise<void> {
    this.headingSectionCache.clear();
    this.updateCharacterCount();
    this.app.workspace.updateOptions();
    this.app.workspace.trigger("css-change");
  }

  private scheduleCharacterCountUpdate(): void {
    this.headingSectionCache.clear();
    if (this.characterCountTimer !== null) {
      window.clearTimeout(this.characterCountTimer);
    }
    this.characterCountTimer = window.setTimeout(() => {
      this.characterCountTimer = null;
      this.updateCharacterCount();
    }, 1000);
  }

  private updateCharacterCount(): void {
    if (!this.statusBarItem) return;
    if (!this.settings.enableCharacterCount) {
      this.statusBarItem.hide();
      return;
    }

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      this.statusBarItem.hide();
      return;
    }

    const selectedText = view.editor.getSelection();
    const target = selectedText.length > 0 ? selectedText : view.editor.getValue();
    const count = countNovelCharacters(target, this.getCountOptions());
    this.statusBarItem.setText(`${this.settings.countPrefix}${formatCount(count)}${this.settings.countSuffix}`);
    this.statusBarItem.show();
  }

  private createHeadingCountExtension() {
    const plugin = this;
    return ViewPlugin.fromClass(class {
      decorations: DecorationSet;
      private countsByLine = new Map<number, number>();
      private sections: HeadingSection[] = [];
      private view: EditorView;
      private pendingFullRebuild = false;
      private pendingDeltas = new Map<number, number>();
      private timer: number | null = null;

      constructor(view: EditorView) {
        this.view = view;
        this.rebuildAll(plugin, view);
      }

      update(update: ViewUpdate): void {
        this.view = update.view;
        if (update.docChanged) {
          this.decorations = this.decorations.map(update.changes);
          if (plugin.shouldRebuildAllHeadingDecorations(update)) {
            this.pendingFullRebuild = true;
          } else {
            update.changes.iterChanges((fromA, toA, fromB, _toB, inserted) => {
              const oldText = update.startState.doc.sliceString(fromA, toA);
              const newText = inserted.toString();
              if (!plugin.canUseDeltaHeadingCountUpdate(oldText, newText)) {
                this.pendingFullRebuild = true;
                return;
              }

              const delta = plugin.countTextDelta(oldText, newText);
              if (delta === 0) {
                return;
              }

              // デルタ更新パスでは行の増減も見出しの変化もないため、
              // 前回フル構築時のセクション一覧から祖先見出しを引ける
              const targetLine = update.view.state.doc.lineAt(fromB).number - 1;
              const headings = getHeadingAncestorsFromHeadings(this.sections, targetLine);
              for (const heading of headings) {
                this.pendingDeltas.set(heading.line, (this.pendingDeltas.get(heading.line) ?? 0) + delta);
              }
            });
          }
          this.scheduleFlush();
        }
      }

      destroy(): void {
        this.clearPending();
      }

      private scheduleFlush(): void {
        if (this.timer !== null) {
          window.clearTimeout(this.timer);
        }
        this.timer = window.setTimeout(() => {
          this.timer = null;
          if (this.pendingFullRebuild) {
            this.rebuildAll(plugin, this.view);
          } else {
            for (const [lineNumber, delta] of this.pendingDeltas) {
              const current = this.countsByLine.get(lineNumber);
              if (current === undefined) {
                this.pendingFullRebuild = true;
                break;
              }

              const next = Math.max(0, current + delta);
              this.countsByLine.set(lineNumber, next);
              this.decorations = plugin.replaceEditorHeadingDecoration(
                this.view,
                this.decorations,
                { line: lineNumber, count: next }
              );
            }

            if (this.pendingFullRebuild) {
              this.rebuildAll(plugin, this.view);
            }
          }

          this.pendingFullRebuild = false;
          this.pendingDeltas.clear();
          this.view.dispatch({});
        }, 700);
      }

      private rebuildAll(plugin: JapaneseNovelToolPlugin, view: EditorView): void {
        const result = plugin.buildEditorDecorationsWithCounts(view);
        this.decorations = result.decorations;
        this.countsByLine = result.countsByLine;
        this.sections = result.sections;
      }

      private clearPending(): void {
        if (this.timer !== null) {
          window.clearTimeout(this.timer);
          this.timer = null;
        }
        this.pendingFullRebuild = false;
        this.pendingDeltas.clear();
      }
    }, {
      decorations: (value) => value.decorations
    });
  }

  private createRubyExtension() {
    const plugin = this;
    return ViewPlugin.fromClass(class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = plugin.buildRubyDecorations(view);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged || update.selectionSet || update.focusChanged) {
          this.decorations = plugin.buildRubyDecorations(update.view);
        }
      }
    }, {
      decorations: (value) => value.decorations
    });
  }

  private buildRubyDecorations(view: EditorView): DecorationSet {
    if (!this.settings.enableRubyRendering) {
      return Decoration.none;
    }

    const builder = new RangeSetBuilder<Decoration>();
    const selections = view.state.selection.ranges;
    let lastLine = -1;
    type PendingDecoration = { from: number; to: number; decoration: Decoration };

    for (const visibleRange of view.visibleRanges) {
      for (let pos = visibleRange.from; pos <= visibleRange.to;) {
        const line = view.state.doc.lineAt(pos);
        if (line.number === lastLine) {
          pos = line.to + 1;
          continue;
        }
        lastLine = line.number;

        if (selections.some((range) => range.to >= line.from && range.from <= line.to)) {
          pos = line.to + 1;
          continue;
        }

        const pending: PendingDecoration[] = [];

        if (/《[^》]+》/.test(line.text)) {
          NOVEL_RUBY_REGEXP.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = NOVEL_RUBY_REGEXP.exec(line.text)) !== null) {
            const body = match.groups?.body1 || match.groups?.body2;
            const rubyText = match.groups?.ruby;
            if (!body || !rubyText) continue;

            const matchStart = line.from + match.index;
            const matchEnd = matchStart + match[0].length;
            if (selections.some((range) => range.to >= matchStart && range.from <= matchEnd)) {
              continue;
            }

            if (this.isExcludedSyntax(view, matchStart + 1)) {
              continue;
            }

            const fullMatchText = match[0];
            const bodyIndex = fullMatchText.indexOf(body);
            const prefixLength = bodyIndex;
            const isTablePipe = prefixLength === 1 && fullMatchText[0] === "|" && body.startsWith(" ");

            if (prefixLength > 0 && !isTablePipe) {
              pending.push({ from: matchStart, to: matchStart + prefixLength, decoration: Decoration.replace({}) });
            }

            let rubyContentStart = matchStart + prefixLength;
            if (isTablePipe) {
              rubyContentStart += 1;
              const kanjiMatch = body.match(/[一-龠々仝〆〇ヶ]+$/);
              if (kanjiMatch && body.length - 1 > kanjiMatch[0].length) {
                rubyContentStart = matchStart + prefixLength + (body.length - kanjiMatch[0].length);
              }
            }

            pending.push({
              from: rubyContentStart,
              to: matchEnd,
              decoration: Decoration.mark({ tagName: "ruby", class: "jnt-ruby" })
            });

            const bodyEndRel = bodyIndex + body.length;
            const startDelimStart = matchStart + bodyEndRel;
            const startDelimEnd = startDelimStart + "《".length;
            pending.push({ from: startDelimStart, to: startDelimEnd, decoration: Decoration.replace({}) });

            const rubyStart = startDelimEnd;
            const rubyEnd = rubyStart + rubyText.length;
            if (rubyEnd > rubyStart) {
              pending.push({ from: rubyStart, to: rubyEnd, decoration: Decoration.mark({ tagName: "rt" }) });
            }

            const endDelimStart = rubyEnd;
            const endDelimEnd = matchEnd;
            if (endDelimEnd > endDelimStart) {
              pending.push({ from: endDelimStart, to: endDelimEnd, decoration: Decoration.replace({}) });
            }
          }
        }

        if (this.settings.enableKakuyomuEmphasis) {
          KAKUYOMU_EMPHASIS_REGEXP.lastIndex = 0;
          let emphasisMatch: RegExpExecArray | null;
          while ((emphasisMatch = KAKUYOMU_EMPHASIS_REGEXP.exec(line.text)) !== null) {
            const body = emphasisMatch.groups?.body;
            if (!body) continue;

            const matchStart = line.from + emphasisMatch.index;
            const matchEnd = matchStart + emphasisMatch[0].length;
            if (selections.some((range) => range.to >= matchStart && range.from <= matchEnd)) {
              continue;
            }
            if (this.isExcludedSyntax(view, matchStart + 1)) {
              continue;
            }

            const bodyStart = matchStart + "《《".length;
            const bodyEnd = bodyStart + body.length;
            pending.push({ from: matchStart, to: bodyStart, decoration: Decoration.replace({}) });
            pending.push({
              from: bodyStart,
              to: bodyEnd,
              decoration: Decoration.mark({ class: "jnt-emphasis" })
            });
            pending.push({ from: bodyEnd, to: matchEnd, decoration: Decoration.replace({}) });
          }
        }

        pending
          .sort((a, b) => a.from - b.from || a.to - b.to)
          .forEach((item) => builder.add(item.from, item.to, item.decoration));

        pos = line.to + 1;
      }
    }

    return builder.finish();
  }

  private isExcludedSyntax(view: EditorView, pos: number): boolean {
    const node = syntaxTree(view.state).resolve(pos);
    const nodeName = node.name;
    const parentName = node.parent?.name ?? "";
    return /code|image/i.test(nodeName) || /code|image/i.test(parentName);
  }

  private buildEditorDecorationsWithCounts(view: EditorView): {
    decorations: DecorationSet;
    countsByLine: Map<number, number>;
    sections: HeadingSection[];
  } {
    if (!this.settings.showHeadingCounts) {
      return { decorations: Decoration.none, countsByLine: new Map(), sections: [] };
    }

    const sections = getHeadingSections(view.state.doc.toString(), this.getCountOptions());
    const countsByLine = new Map<number, number>();
    const decorations = sections.map((section) => {
      countsByLine.set(section.line, section.count);
      const line = view.state.doc.line(section.line + 1);
      return Decoration.widget({
        widget: new HeadingCountWidget(section.count),
        side: 1
      }).range(line.to);
    });
    return { decorations: Decoration.set(decorations, true), countsByLine, sections };
  }

  private replaceEditorHeadingDecoration(
    view: EditorView,
    decorations: DecorationSet,
    section: Pick<HeadingSection, "line" | "count">
  ): DecorationSet {
    const line = view.state.doc.line(section.line + 1);
    return decorations.update({
      filter: (from) => from !== line.to,
      add: [Decoration.widget({
        widget: new HeadingCountWidget(section.count),
        side: 1
      }).range(line.to)],
      sort: true
    });
  }

  private countTextDelta(oldText: string, newText: string): number {
    return countNovelCharacters(newText, this.getCountOptions()) - countNovelCharacters(oldText, this.getCountOptions());
  }

  private canUseDeltaHeadingCountUpdate(oldText: string, newText: string): boolean {
    const changedText = oldText + newText;
    if (/[\r\n]/.test(changedText)) {
      return false;
    }

    if (/[#*_~=`>\[\]()!|｜《》﹅﹆・]/.test(changedText)) {
      return false;
    }

    return true;
  }

  private shouldRebuildAllHeadingDecorations(update: ViewUpdate): boolean {
    let shouldRebuild = false;
    let changeCount = 0;
    update.changes.iterChangedRanges((fromA, _toA, fromB, toB) => {
      changeCount += 1;
      if (changeCount > 1) {
        shouldRebuild = true;
        return;
      }

      if (shouldRebuild) {
        return;
      }

      const changedText = update.view.state.doc.sliceString(fromB, toB);
      const line = update.view.state.doc.lineAt(fromB);
      const oldLine = update.startState.doc.lineAt(fromA);
      shouldRebuild = /^\s{0,3}#{1,6}\s/.test(oldLine.text)
        || /^#{1,6}\s/.test(line.text)
        || /\n\s{0,3}#{1,6}\s/.test(changedText)
        || /^[=-]+$/.test(oldLine.text.trim())
        || /^[=-]+$/.test(line.text.trim());
    });
    return shouldRebuild;
  }

  private async decorateReadingView(element: HTMLElement, context: MarkdownPostProcessorContext): Promise<void> {
    if (!this.settings.showHeadingCounts) {
      return;
    }

    const headings = Array.from(element.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    if (headings.length === 0) {
      return;
    }

    const file = this.app.vault.getAbstractFileByPath(context.sourcePath);
    if (!(file instanceof TFile) || file.extension !== "md") {
      return;
    }

    const sections = await this.getCachedHeadingSections(file);
    const sectionInfo = context.getSectionInfo(element);
    for (const heading of headings) {
      if (heading.querySelector(".jnt-heading-count-reading")) {
        continue;
      }

      const level = Number.parseInt(heading.tagName.slice(1), 10);
      const section = this.findReadingSection(sections, level, heading.textContent ?? "", sectionInfo?.lineStart);
      if (!section) {
        continue;
      }

      const countElement = document.createElement("span");
      countElement.className = "jnt-heading-count jnt-heading-count-reading";
      countElement.textContent = formatCount(section.count);
      heading.appendChild(countElement);
    }
  }

  private async getCachedHeadingSections(file: TFile): Promise<HeadingSection[]> {
    const cached = this.headingSectionCache.get(file.path);
    if (cached && cached.mtime === file.stat.mtime) {
      return cached.sections;
    }

    const source = await this.app.vault.cachedRead(file);
    const sections = getHeadingSections(source, this.getCountOptions());
    this.headingSectionCache.set(file.path, { mtime: file.stat.mtime, sections });
    return sections;
  }

  private findReadingSection(sections: HeadingSection[], level: number, text: string, lineStart?: number): HeadingSection | undefined {
    const normalizedText = text.replace(/\d[\d,]*$/, "").trim();
    const exactLine = lineStart === undefined
      ? undefined
      : sections.find((section) => section.line === lineStart && section.level === level);
    return exactLine ?? sections.find((section) => section.level === level && section.text === normalizedText);
  }

  private clearReadingViewCounts(): void {
    document.querySelectorAll(".jnt-heading-count-reading").forEach((element) => element.remove());
  }

  private getCountOptions(): CountOptions {
    return {
      excludeWhitespace: this.settings.excludeWhitespaceFromCount,
      excludeNewlines: this.settings.excludeNewlinesFromCount,
      excludeRuby: this.settings.excludeRubyFromCount,
      excludeCallouts: this.settings.excludeCalloutsFromCount,
      excludeComments: this.settings.excludeCommentsFromCount,
      excludeHeadings: this.settings.excludeHeadingsFromCount,
      excludeMarkdownControls: this.settings.excludeMarkdownControlsFromCount,
      enableKakuyomuEmphasis: this.settings.enableKakuyomuEmphasis
    };
  }
}

class HeadingCountWidget extends WidgetType {
  constructor(private readonly count: number) {
    super();
  }

  toDOM(): HTMLElement {
    const element = document.createElement("span");
    element.className = "jnt-heading-count jnt-heading-count-editor-widget";
    element.textContent = formatCount(this.count);
    return element;
  }

  eq(other: HeadingCountWidget): boolean {
    return other.count === this.count;
  }
}

function renderNovelMarkup(root: HTMLElement, enableKakuyomuEmphasis: boolean): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest("code, pre, script, style, ruby")) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue || !/[｜《》]/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    const tokens = parseNovelMarkup(node.nodeValue ?? "", enableKakuyomuEmphasis);
    let changed = false;

    for (const token of tokens) {
      if (token.type === "text") {
        fragment.appendText(token.text);
        continue;
      }

      changed = true;
      if (token.type === "ruby") {
        const ruby = document.createElement("ruby");
        ruby.addClass("jnt-ruby");
        ruby.appendText(token.base);
        const rt = document.createElement("rt");
        rt.appendText(token.ruby);
        ruby.appendChild(rt);
        fragment.appendChild(ruby);
        continue;
      }

      const span = document.createElement("span");
      span.addClass("jnt-emphasis");
      span.appendText(token.text);
      fragment.appendChild(span);
    }

    if (changed) {
      node.parentNode?.replaceChild(fragment, node);
    }
  }
}

function renderJapaneseIndentation(root: HTMLElement, context: MarkdownPostProcessorContext, editor?: Editor): void {
  const paragraph = root.querySelector("p");
  if (!paragraph || !editor) {
    return;
  }

  const sectionInfo = context.getSectionInfo(root);
  if (!sectionInfo) {
    return;
  }

  const editorLines = getEditorLines(editor, sectionInfo.lineStart, sectionInfo.lineEnd);
  const childNodes = formattedIndentChildNodes(paragraph, editorLines);
  paragraph.replaceChildren(...childNodes);
}

function formattedIndentChildNodes(paragraph: HTMLParagraphElement, editorLines: readonly string[]): ChildNode[] {
  const lines = editorLines.slice(1);

  return Array.from(paragraph.childNodes).map((childNode) => {
    const text = childNode.textContent;
    if (text == null) {
      return childNode;
    }

    if (childNode.nodeName === "#text" && text.startsWith("\n")) {
      const line = lines.shift();
      if (line == null) {
        return childNode;
      }

      const space = line.match(/^\s+/)?.[0];
      if (space == null) {
        return childNode;
      }

      const chars = Array.from(text);
      chars.splice(1, 0, space);
      const clone = childNode.cloneNode() as ChildNode;
      clone.textContent = chars.join("");
      return clone;
    }

    return childNode;
  });
}

function getEditorLines(editor: Editor, lineStart: number, lineEnd: number): string[] {
  const editorLines: string[] = [];
  for (let lineNumber = lineStart; lineNumber <= lineEnd; lineNumber += 1) {
    const line = editor.getLine(lineNumber);
    if (line == null) {
      continue;
    }

    if (/^ *> ?\[!.+?\]/.test(line)) {
      continue;
    }

    const quoteSymbol = line.match(/^((>| )*)?>/)?.[0];
    if (quoteSymbol != null) {
      const chars = Array.from(line);
      chars.splice(0, quoteSymbol.length);
      editorLines.push(chars.join(""));
      continue;
    }

    editorLines.push(line);
  }
  return editorLines;
}

function insertRuby(editor: Editor): void {
  const selection = editor.getSelection();
  const text = selection.length > 0 ? `｜${selection}《》` : "｜《》";
  editor.replaceSelection(text);
  const cursor = editor.getCursor();
  editor.setCursor({ line: cursor.line, ch: Math.max(0, cursor.ch - 1) });
}

function insertEmphasis(editor: Editor, format: "kakuyomu" | "aozora", emphasisMark: string): void {
  const selection = editor.getSelection();
  if (format === "aozora") {
    const mark = Array.from(emphasisMark.trim())[0] ?? "﹅";
    const markCount = Math.max(1, Array.from(selection.replace(/\r?\n/g, "")).length);
    editor.replaceSelection(selection.length > 0 ? `｜${selection}《${mark.repeat(markCount)}》` : `｜《${mark}》`);
    return;
  }
  editor.replaceSelection(selection.length > 0 ? `《《${selection}》》` : "《《》》");
  if (selection.length === 0) {
    const cursor = editor.getCursor();
    editor.setCursor({ line: cursor.line, ch: Math.max(0, cursor.ch - 2) });
  }
}

function removeMarkupFromSelection(editor: Editor, enableKakuyomuEmphasis: boolean): void {
  const selection = editor.getSelection();
  if (selection.length === 0) return;
  editor.replaceSelection(removeNovelMarkup(selection, enableKakuyomuEmphasis));
}
