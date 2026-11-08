type HtmlNode = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: HtmlNode[]; position?: { start: { offset?: number } } };

export type ImageUnit = "px" | "%";
export type ImageAlign = "left" | "center" | "right";
export type ImageSettings = { caption: string; width?: { value: number; unit: ImageUnit }; align?: ImageAlign };

const WIDTH_SETTING = /^width=(\d{1,4})(px|%)?$/;
const ALIGN_SETTING = /^align=(left|center|right)$/;

// A constrained title suffix supports sizing and alignment without allowing
// author-supplied HTML/CSS. Examples: "width=480px", "caption | width=60% | align=center".
export function parseImageSettings(title: string): ImageSettings {
  const segments = title.split(" | ");
  const settings: ImageSettings = { caption: "" };
  let index = segments.length;
  while (index > 0) {
    const width = segments[index - 1].match(WIDTH_SETTING);
    if (width) {
      const value = Number(width[1]);
      const unit = (width[2] || "px") as ImageUnit;
      const valid = unit === "%" ? value >= 1 && value <= 100 : value >= 16 && value <= 2400;
      if (!valid) break;
      settings.width = { value, unit };
      index -= 1;
      continue;
    }
    const align = segments[index - 1].match(ALIGN_SETTING);
    if (align) {
      settings.align = align[1] as ImageAlign;
      index -= 1;
      continue;
    }
    break;
  }
  settings.caption = segments.slice(0, index).join(" | ");
  return settings;
}

// Margins keep the vertical rhythm of .prose while shifting the block image.
const ALIGN_MARGINS: Record<ImageAlign, string> = {
  left: "margin:1.3em auto 1.3em 0",
  center: "margin:1.3em auto",
  right: "margin:1.3em 0 1.3em auto",
};

export function imageSettingsStyle(settings: ImageSettings): string {
  const parts: string[] = [];
  if (settings.width) parts.push(`width:${settings.width.value}${settings.width.unit}`);
  if (settings.align) parts.push(ALIGN_MARGINS[settings.align]);
  return parts.join(";");
}

export function rehypeImageSizing(options: { studio?: boolean } = {}) {
  return (tree: HtmlNode) => {
    const walk = (node: HtmlNode, insideLink = false) => {
      if (node.type === "element" && node.tagName === "img" && node.properties) {
        if (options.studio && node.position?.start.offset !== undefined) {
          node.properties["data-studio-start"] = node.position.start.offset;
        }
        if (!insideLink) {
          node.properties.tabIndex = 0;
          node.properties.role = "button";
          node.properties.ariaLabel = `放大图片：${node.properties.alt || "正文图片"}`;
        }
        const settings = parseImageSettings(String(node.properties.title || ""));
        const style = imageSettingsStyle(settings);
        if (style) {
          node.properties.style = style;
          if (settings.caption) node.properties.title = settings.caption;
          else delete node.properties.title;
        }
      }
      node.children?.forEach((child) => walk(child, insideLink || node.tagName === "a"));
    };
    walk(tree);
  };
}
