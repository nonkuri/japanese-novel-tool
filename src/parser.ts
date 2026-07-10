export type NovelToken =
  | { type: "text"; text: string }
  | { type: "ruby"; base: string; ruby: string }
  | { type: "emphasis"; text: string };

const RUBY_START_MARK = "｜";
const ANNOTATION_START = "《";
const ANNOTATION_END = "》";

export const NOVEL_RUBY_REGEXP = /(?:(?:[|｜]?(?<body1>[一-龠々仝〆〇ヶ]+?))|(?:[|｜](?<body2>[^|｜]+?)))《(?<ruby>.+?)》/gm;
export const KAKUYOMU_EMPHASIS_REGEXP = /《《(?<body>.+?)》》/gm;
const NOVEL_RUBY_STICKY_REGEXP = /(?:(?:[|｜]?(?<body1>[一-龠々仝〆〇ヶ]+?))|(?:[|｜](?<body2>[^|｜]+?)))《(?<ruby>.+?)》/y;
const RUBY_CANDIDATE_CHAR_REGEXP = /[|｜一-龠々仝〆〇ヶ]/;

export function parseNovelMarkup(input: string, enableKakuyomuEmphasis: boolean): NovelToken[] {
  const tokens: NovelToken[] = [];
  let plainStart = 0;
  let index = 0;

  const flushPlainText = (end: number) => {
    if (end <= plainStart) return;
    const text = input.slice(plainStart, end);
    const last = tokens[tokens.length - 1];
    if (last?.type === "text") {
      last.text += text;
      return;
    }
    tokens.push({ type: "text", text });
  };

  while (index < input.length) {
    const char = input.charAt(index);

    if (enableKakuyomuEmphasis && char === ANNOTATION_START && input.startsWith("《《", index)) {
      const end = input.indexOf("》》", index + 2);
      if (end !== -1) {
        flushPlainText(index);
        tokens.push({ type: "emphasis", text: input.slice(index + 2, end) });
        index = end + 2;
        plainStart = index;
        continue;
      }
    }

    // ルビは「｜」「|」または漢字類からしか始まらないので、それ以外の文字では照合しない
    if (RUBY_CANDIDATE_CHAR_REGEXP.test(char)) {
      NOVEL_RUBY_STICKY_REGEXP.lastIndex = index;
      const rubyMatch = NOVEL_RUBY_STICKY_REGEXP.exec(input);
      if (rubyMatch) {
        const base = rubyMatch.groups?.body1 || rubyMatch.groups?.body2 || "";
        const ruby = rubyMatch.groups?.ruby || "";
        flushPlainText(index);
        if (isEmphasisAnnotation(ruby)) {
          tokens.push({ type: "emphasis", text: base });
        } else {
          tokens.push({ type: "ruby", base, ruby });
        }
        index += rubyMatch[0].length;
        plainStart = index;
        continue;
      }
    }

    index += 1;
  }

  flushPlainText(input.length);
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
