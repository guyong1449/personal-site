const WIDTH_SETTING = /^width=(\d{1,4})(px|%)?$/;
const ALIGN_SETTING = /^align=(left|center|right)$/;

// Mirrors apps/web/src/lib/markdown/image-sizing.ts: trailing " | key=value"
// title segments carry layout hints; anything before them is the caption.
function parseImageSettings(title) {
  const segments = title.split(" | ");
  const settings = { caption: "", width: null, unit: "%", align: "" };
  let index = segments.length;
  while (index > 0) {
    const width = segments[index - 1].match(WIDTH_SETTING);
    if (width) {
      const value = Number(width[1]);
      const valid = width[2] === "%" ? value >= 1 && value <= 100 : value >= 16 && value <= 2400;
      if (!valid) break;
      settings.width = value;
      settings.unit = width[2] || "px";
      index -= 1;
      continue;
    }
    const align = segments[index - 1].match(ALIGN_SETTING);
    if (align) {
      settings.align = align[1];
      index -= 1;
      continue;
    }
    break;
  }
  settings.caption = segments.slice(0, index).join(" | ");
  return settings;
}

export function listMarkdownImages(markdown) {
  const images = [];
  let fence = null;
  let offset = 0;
  for (const line of markdown.split(/(?<=\n)/)) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
    } else if (!fence) {
      const visible = line.replace(/(`+)[^\n]*?\1/g, (code) => " ".repeat(code.length));
      const pattern = /!\[((?:\\.|[^\]\\])*)\]\((<[^>\n]+>|(?:\\.|[^\s()])+(?:\([^()\n]*\)(?:\\.|[^\s()])*)*)(?:[ \t]+"((?:\\.|[^"\\])*)")?[ \t]*\)/g;
      for (const match of visible.matchAll(pattern)) {
        const title = match[3] || "";
        const settings = parseImageSettings(title);
        images.push({ start: offset + match.index, end: offset + match.index + match[0].length,
          alt: match[1], url: match[2], title,
          width: settings.width ?? 100, unit: settings.width ? settings.unit : "%", align: settings.align });
      }
    }
    offset += line.length;
  }
  return images;
}

// width/align follow the same contract: undefined keeps the current value,
// null removes it, a concrete value sets it.
export function resizeMarkdownImage(markdown, index, width, unit, align) {
  const image = listMarkdownImages(markdown)[index];
  if (!image) throw new Error("请先选择正文图片");
  const current = parseImageSettings(image.title);
  let nextWidth = current.width;
  let nextUnit = current.unit;
  if (width !== undefined) {
    if (width === null) {
      nextWidth = null;
    } else {
      const size = Number(width);
      if (!Number.isInteger(size) || !["%", "px"].includes(unit) ||
          size < (unit === "%" ? 1 : 16) || size > (unit === "%" ? 100 : 2400)) {
        throw new Error("宽度请输入 1–100% 或 16–2400px");
      }
      nextWidth = size;
      nextUnit = unit;
    }
  }
  const nextAlign = align === undefined ? current.align : align;
  const parts = [];
  if (current.caption) parts.push(current.caption);
  if (nextWidth !== null) parts.push(`width=${nextWidth}${nextUnit}`);
  if (nextAlign) parts.push(`align=${nextAlign}`);
  const title = parts.join(" | ");
  const replacement = `![${image.alt}](${image.url}${title ? ` "${title}"` : ""})`;
  return markdown.slice(0, image.start) + replacement + markdown.slice(image.end);
}
