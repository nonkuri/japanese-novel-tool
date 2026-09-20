import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { EditorState } from "@codemirror/state";

const require = createRequire(import.meta.url);
const timers = new Map();
let timerId = 0;
const { outputFiles } = await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  packages: "external",
  write: false
});
const module = { exports: {} };
runInNewContext(outputFiles[0].text, {
  module,
  exports: module.exports,
  require: (name) => name === "obsidian"
    ? { Plugin: class {}, PluginSettingTab: class {} }
    : require(name),
  window: {
    setTimeout: (callback) => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id) => timers.delete(id)
  }
});
const Plugin = module.exports.default;

function setup(source, excludeCallouts = true) {
  const plugin = new Plugin();
  plugin.settings = {
    showHeadingCounts: true,
    excludeCalloutsFromCount: excludeCallouts,
    excludeWhitespaceFromCount: true,
    excludeNewlinesFromCount: true
  };
  const view = { state: EditorState.create({ doc: source }), dispatch() {} };
  const counter = plugin.createHeadingCountExtension().create(view);
  return {
    count: () => counter.countsByLine.get(0),
    edit(from, to, insert) {
      const transaction = view.state.update({ changes: { from, to, insert } });
      view.state = transaction.state;
      counter.update({
        view,
        docChanged: true,
        changes: transaction.changes,
        startState: transaction.startState
      });
      const fullRebuild = counter.pendingFullRebuild;
      for (const [id, callback] of timers) {
        timers.delete(id);
        callback();
      }
      return fullRebuild;
    }
  };
}

test("Callout本文への入力・削除で見出しカウントが変わらない", () => {
  const source = "# 章\n本文\n> [!note] メモ\n> 除外対象\n\n末尾";
  const counter = setup(source);
  assert.equal(counter.count(), 4);
  const at = source.indexOf("除外対象") + 2;
  counter.edit(at, at, "追加");
  assert.equal(counter.count(), 4);
  counter.edit(at, at + 2, "");
  assert.equal(counter.count(), 4);
});

test("折り畳みCalloutのタイトル編集も除外する", () => {
  const source = "# 章\n本文\n> [!note]- メモ\n> 対象";
  const counter = setup(source);
  const at = source.indexOf("メモ");
  counter.edit(at, at + 2, "長いタイトル");
  assert.equal(counter.count(), 2);
});

test("通常の引用はCalloutとして除外しない", () => {
  const source = "# 章\n本文\n> 引用";
  const counter = setup(source);
  const before = counter.count();
  counter.edit(source.length, source.length, "追加");
  assert.equal(counter.count(), before + 2);
});

test("除外オフならCallout内も差分更新で数える", () => {
  const source = "# 章\n> [!note]\n> メモ";
  const counter = setup(source, false);
  const before = counter.count();
  assert.equal(counter.edit(source.length, source.length, "追加"), false);
  assert.equal(counter.count(), before + 2);
});

test("Calloutの外の本文は差分更新を維持する", () => {
  const source = "# 章\n> [!note]\n> メモ\n\n本文";
  const counter = setup(source);
  assert.equal(counter.edit(source.length, source.length, "追加"), false);
  assert.equal(counter.count(), 4);
});
