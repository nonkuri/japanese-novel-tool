import { stripNovelMarkup } from "./parser";

export interface CountOptions {
  excludeWhitespace: boolean;
  excludeNewlines: boolean;
  excludeRuby: boolean;
  excludeCallouts: boolean;
  excludeComments: boolean;
  excludeHeadings: boolean;
  excludeMarkdownControls: boolean;
  enableKakuyomuEmphasis: boolean;
}

export interface HeadingSection {
  line: number;
  level: number;
  text: string;
  count: number;
}

export interface HeadingRef {
  line: number;
  level: number;
  text: string;
}

interface Heading {
  line: number;
  level: number;
  text: string;
}

const COMMENT_PATTERN = /%%[\s\S]*?%%/g;
const NEWLINE_PATTERN = /\r\n|\r|\n/g;
const WHITESPACE_EXCEPT_NEWLINES_PATTERN = /[^\S\r\n]+/g;
const ATX_HEADING_PATTERN = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/;
const SETEXT_HEADING_PATTERN = /^[ \t]*(=+|-+)[ \t]*$/;
const FENCE_PATTERN = /^[ \t]{0,3}(`{3,}|~{3,})/;
const CALLOUT_START_PATTERN = /^[ \t]*>[ \t]*\[![^\]]+\]/i;
const BLOCKQUOTE_PATTERN = /^[ \t]*>/;

export function countNovelCharacters(markdown: string, options: CountOptions): number {
  return prepareTextForCount(markdown, options).length;
}

export function prepareTextForCount(source: string, options: CountOptions): string {
  let text = source;
  if (options.excludeComments) {
    text = text.replace(COMMENT_PATTERN, "");
  }
  if (options.excludeCallouts) {
    text = removeCallouts(text);
  }
  if (options.excludeHeadings) {
    text = removeHeadingLines(text);
  }
  if (options.excludeRuby) {
    text = stripNovelMarkup(text, options.enableKakuyomuEmphasis);
  }
  if (options.excludeMarkdownControls) {
    text = stripMarkdownControls(text);
  }
  if (options.excludeWhitespace) {
    text = text.replace(WHITESPACE_EXCEPT_NEWLINES_PATTERN, "");
  }
  if (options.excludeNewlines) {
    text = text.replace(NEWLINE_PATTERN, "");
  }
  return text;
}

export function getHeadingSections(source: string, options: CountOptions): HeadingSection[] {
  const lines = splitLines(source);
  const headings = findHeadings(lines);
  return headings.map((heading, index) => {
    const nextHeading = headings.slice(index + 1).find((candidate) => candidate.level <= heading.level);
    const endLine = nextHeading?.line ?? lines.length;
    const sectionText = lines.slice(heading.line + 1, endLine).join("\n");
    return {
      ...heading,
      count: countNovelCharacters(sectionText, options)
    };
  });
}

export function getHeadingSectionAtOffset(source: string, offset: number, options: CountOptions): HeadingSection | undefined {
  const sections = getHeadingSectionsAtOffset(source, offset, options);
  return sections[sections.length - 1];
}

export function getHeadingSectionsAtOffset(source: string, offset: number, options: CountOptions): HeadingSection[] {
  const lines = splitLines(source);
  const lineStarts = getLineStarts(source, lines);
  const targetLine = findLineAtOffset(lineStarts, offset);
  const headings = findHeadings(lines);

  const ancestors: Array<{ heading: Heading; index: number }> = [];
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    if (heading.line > targetLine) {
      break;
    }

    while (ancestors.length > 0 && ancestors[ancestors.length - 1].heading.level >= heading.level) {
      ancestors.pop();
    }
    ancestors.push({ heading, index });
  }

  if (ancestors.length === 0) {
    return [];
  }

  return ancestors.map(({ heading, index }) => {
    const nextHeading = headings.slice(index + 1).find((candidate) => candidate.level <= heading.level);
    const endLine = nextHeading?.line ?? lines.length;
    const sectionText = lines.slice(heading.line + 1, endLine).join("\n");
    return {
      ...heading,
      count: countNovelCharacters(sectionText, options)
    };
  });
}

export function getHeadingAncestorsAtOffset(source: string, offset: number): HeadingRef[] {
  const lines = splitLines(source);
  const lineStarts = getLineStarts(source, lines);
  const targetLine = findLineAtOffset(lineStarts, offset);
  const headings = findHeadings(lines);
  const ancestors: HeadingRef[] = [];

  for (const heading of headings) {
    if (heading.line > targetLine) {
      break;
    }

    while (ancestors.length > 0 && ancestors[ancestors.length - 1].level >= heading.level) {
      ancestors.pop();
    }
    ancestors.push(heading);
  }

  return ancestors;
}

export function isHeadingLineAtOffset(source: string, offset: number): boolean {
  const lines = splitLines(source);
  const lineStarts = getLineStarts(source, lines);
  const targetLine = findLineAtOffset(lineStarts, offset);
  return findHeadings(lines).some((heading) => heading.line === targetLine);
}

export function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}

export function stripMarkdownControls(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[^\n]*\n?|```/g, ""))
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/^(\s{0,3})#{1,6}\s+/gm, "$1")
    .replace(/^(\s{0,3})([-*+]|\d+\.)\s+/gm, "$1")
    .replace(/^(\s{0,3})>\s?/gm, "$1")
    .replace(/[*_~=#|\\>-]/g, "");
}

function removeCallouts(source: string): string {
  const lines = splitLines(source);
  const result: string[] = [];
  let inCallout = false;
  for (const line of lines) {
    if (!inCallout && CALLOUT_START_PATTERN.test(line)) {
      inCallout = true;
      continue;
    }
    if (inCallout) {
      if (BLOCKQUOTE_PATTERN.test(line) || line.trim() === "") {
        continue;
      }
      inCallout = false;
    }
    result.push(line);
  }
  return result.join("\n");
}

function removeHeadingLines(source: string): string {
  const lines = splitLines(source);
  const headings = new Set(findHeadings(lines).map((heading) => heading.line));
  return lines.filter((_, index) => !headings.has(index)).join("\n");
}

function findHeadings(lines: string[]): Heading[] {
  const headings: Heading[] = [];
  let fenceMarker: string | null = null;

  for (let line = 0; line < lines.length; line += 1) {
    const value = lines[line] ?? "";
    const fenceMatch = value.match(FENCE_PATTERN);
    if (fenceMatch) {
      const marker = fenceMatch[1] ?? "";
      if (fenceMarker === null) {
        fenceMarker = marker;
      } else if (marker[0] === fenceMarker[0] && marker.length >= fenceMarker.length) {
        fenceMarker = null;
      }
      continue;
    }

    if (fenceMarker !== null || BLOCKQUOTE_PATTERN.test(value)) {
      continue;
    }

    const atxMatch = value.match(ATX_HEADING_PATTERN);
    if (atxMatch) {
      headings.push({
        line,
        level: atxMatch[1]?.length ?? 1,
        text: atxMatch[2]?.trim() ?? ""
      });
      continue;
    }

    const nextLine = lines[line + 1] ?? "";
    const setextMatch = nextLine.match(SETEXT_HEADING_PATTERN);
    if (value.trim() !== "" && setextMatch) {
      headings.push({
        line,
        level: setextMatch[1]?.startsWith("=") ? 1 : 2,
        text: value.trim()
      });
      line += 1;
    }
  }

  return headings;
}

function splitLines(source: string): string[] {
  return source.split(/\r\n|\r|\n/);
}

function getLineStarts(source: string, lines: string[]): number[] {
  const starts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }
  if (source.endsWith("\n")) {
    starts.push(source.length);
  }
  return starts;
}

function findLineAtOffset(lineStarts: number[], offset: number): number {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const start = lineStarts[mid] ?? 0;
    const next = lineStarts[mid + 1] ?? Number.POSITIVE_INFINITY;
    if (offset < start) {
      high = mid - 1;
    } else if (offset >= next) {
      low = mid + 1;
    } else {
      return mid;
    }
  }
  return Math.max(0, lineStarts.length - 1);
}
