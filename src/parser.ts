export type NovelToken =
  | { type: "text"; text: string }
  | { type: "ruby"; base: string; ruby: string }
  | { type: "emphasis"; text: string };

const RUBY_START_MARK = "｜";
const ANNOTATION_START = "《";
const ANNOTATION_END = "》";

export const NOVEL_RUBY_REGEXP = /(?:(?:[|｜]?(?<body1>[一-龠々仝〆〇ヶ]+?))|(?:[|｜](?<body2>[^|｜]+?)))《(?<ruby>.+?)》/gm;
export const KAKUYOMU_EMPHASIS_REGEXP = /《《(?<body>.+?)》》/gm;
const NOVEL_RUBY_AT_START_REGEXP = /^(?:(?:[|｜]?(?<body1>[一-龠々仝〆〇ヶ]+?))|(?:[|｜](?<body2>[^|｜]+?)))《(?<ruby>.+?)》/m;

export function parseNovelMarkup(input: string, enableKakuyomuEmphasis: boolean): NovelToken[] {
  const tokens: NovelToken[] = [];
  let buffer = "";
  let index = 0;

  const pushText = (text: string) => {
    if (text.length === 0) return;
    const last = tokens[tokens.length - 1];
    if (last?.type === "text") {
      last.text += text;
      return;
    }
    tokens.push({ type: "text", text });
  };

  const flush = () => {
    pushText(buffer);
    buffer = "";
  };

  while (index < input.length) {
    if (enableKakuyomuEmphasis && input.startsWith("《《", index)) {
      const end = input.indexOf("》》", index + 2);
      if (end !== -1) {
        flush();
        tokens.push({ type: "emphasis", text: input.slice(index + 2, end) });
        index = end + 2;
        continue;
      }
    }

    const rest = input.slice(index);
    const rubyMatch = NOVEL_RUBY_AT_START_REGEXP.exec(rest);
    if (rubyMatch) {
      const base = rubyMatch.groups?.body1 || rubyMatch.groups?.body2 || "";
      const ruby = rubyMatch.groups?.ruby || "";
      flush();
      if (isEmphasisAnnotation(ruby)) {
        tokens.push({ type: "emphasis", text: base });
      } else {
        tokens.push({ type: "ruby", base, ruby });
      }
      index += rubyMatch[0].length;
      continue;
    }

    buffer += input[index];
    index += 1;
  }

  flush();
  return tokens;
}

export function stripNovelMarkup(input: string, enableKakuyomuEmphasis: boolean): string {
  return parseNovelMarkup(input, enableKakuyomuEmphasis)
    .map((token) => {
      if (token.type === "ruby") return token.base;
      if (token.type === "emphasis") return token.text;
      return token.text;
    })
    .join("");
}

export function removeNovelMarkup(input: string, enableKakuyomuEmphasis: boolean): string {
  return stripNovelMarkup(input, enableKakuyomuEmphasis);
}

function isEmphasisAnnotation(annotation: string): boolean {
  const chars = Array.from(annotation);
  if (chars.length === 0) {
    return false;
  }
  if (chars.every((char) => char === "・" || char === "﹅" || char === "﹆")) {
    return true;
  }
  return chars.every((char) => char === chars[0]) && !/[\p{Letter}\p{Number}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(chars[0]);
}
