// Pure textarea selection transforms behind the markdown toolbar and
// keyboard shortcuts. Each helper takes (text, start, end) and returns
// { value, start, end } so the caller can restore the selection.

export function wrapSelection(text, start, end, marker) {
  const selected = text.slice(start, end);
  if (selected.length >= marker.length * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(marker.length, selected.length - marker.length);
    return { value: text.slice(0, start) + inner + text.slice(end), start, end: start + inner.length };
  }
  const value = `${text.slice(0, start)}${marker}${selected}${marker}${text.slice(end)}`;
  const innerStart = start + marker.length;
  return { value, start: innerStart, end: innerStart + selected.length };
}

function lineBounds(text, start, end) {
  const lineStart = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  let lineEnd = text.indexOf("\n", end);
  if (lineEnd === -1) lineEnd = text.length;
  return [lineStart, lineEnd];
}

// Toggles a line prefix (heading, list, quote) across the selected lines;
// empty lines keep their emptiness when the block spans several lines.
export function prefixLines(text, start, end, prefix) {
  const [lineStart, lineEnd] = lineBounds(text, start, end);
  const lines = text.slice(lineStart, lineEnd).split("\n");
  const marked = lines.filter((line) => line.trim()).every((line) => line.startsWith(prefix));
  const next = lines.map((line) => {
    if (marked) return line.startsWith(prefix) ? line.slice(prefix.length) : line;
    if (!line.trim() && lines.length > 1) return line;
    return `${prefix}${line}`;
  }).join("\n");
  return { value: text.slice(0, lineStart) + next + text.slice(lineEnd), start: lineStart, end: lineStart + next.length };
}

export function numberLines(text, start, end) {
  const [lineStart, lineEnd] = lineBounds(text, start, end);
  const lines = text.slice(lineStart, lineEnd).split("\n");
  const numbered = lines.filter((line) => line.trim()).every((line) => /^\d+\.\s/.test(line));
  let index = 0;
  const next = lines.map((line) => {
    if (numbered) return line.replace(/^\d+\.\s/, "");
    if (!line.trim() && lines.length > 1) return line;
    index += 1;
    return `${index}. ${line}`;
  }).join("\n");
  return { value: text.slice(0, lineStart) + next + text.slice(lineEnd), start: lineStart, end: lineStart + next.length };
}

export function codeBlock(text, start, end) {
  const selected = text.slice(start, end);
  const lead = start > 0 && text[start - 1] !== "\n" ? "\n\n" : "";
  const body = selected || "代码";
  const snippet = `${lead}\`\`\`js\n${body}\n\`\`\`\n`;
  const value = text.slice(0, start) + snippet + text.slice(end);
  const bodyStart = start + lead.length + 6; // after "```js\n"
  return { value, start: bodyStart, end: bodyStart + body.length };
}

// Selection that already looks like a URL becomes the destination; otherwise
// it becomes the label and the URL is preselected for typing.
export function linkSelection(text, start, end) {
  const selected = text.slice(start, end);
  const urlLike = /^(https?:\/\/|\/|assets\/|mailto:)\S+$/.test(selected.trim());
  const label = urlLike || !selected ? "链接文字" : selected;
  const url = urlLike ? selected.trim() : "https://";
  const snippet = `[${label}](${url})`;
  const value = text.slice(0, start) + snippet + text.slice(end);
  const urlStart = start + label.length + 3;
  return { value, start: urlStart, end: urlStart + url.length };
}

export function insertSnippet(text, start, end, snippet) {
  const value = text.slice(0, start) + snippet + text.slice(end);
  const cursor = start + snippet.length;
  return { value, start: cursor, end: cursor };
}

export const TABLE_SNIPPET = "| 列一 | 列二 |\n| --- | --- |\n| 内容 | 内容 |\n";
