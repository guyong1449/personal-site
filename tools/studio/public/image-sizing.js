const SIZE_SUFFIX = /^(?:(.*?) \| )?width=(\d{1,4})(px|%)?$/;

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
        const size = title.match(SIZE_SUFFIX);
        images.push({ start: offset + match.index, end: offset + match.index + match[0].length,
          alt: match[1], url: match[2], title,
          width: size ? Number(size[2]) : 100, unit: size?.[3] || (size ? "px" : "%") });
      }
    }
    offset += line.length;
  }
  return images;
}

export function resizeMarkdownImage(markdown, index, width, unit) {
  const image = listMarkdownImages(markdown)[index];
  if (!image) throw new Error("请先选择正文图片");
  const size = Number(width);
  if (width !== null && (!Number.isInteger(size) || !["%", "px"].includes(unit) ||
      size < (unit === "%" ? 1 : 16) || size > (unit === "%" ? 100 : 2400))) {
    throw new Error("宽度请输入 1–100% 或 16–2400px");
  }
  const caption = image.title.match(SIZE_SUFFIX)?.[1] ?? (SIZE_SUFFIX.test(image.title) ? "" : image.title);
  const title = width === null ? caption : `${caption ? `${caption} | ` : ""}width=${size}${unit}`;
  const replacement = `![${image.alt}](${image.url}${title ? ` "${title}"` : ""})`;
  return markdown.slice(0, image.start) + replacement + markdown.slice(image.end);
}
