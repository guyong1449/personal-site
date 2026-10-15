type HtmlNode = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: HtmlNode[] };

// A constrained title suffix supports sizing without allowing author-supplied HTML/CSS.
// Examples: "width=480px", "caption | width=60%".
export function rehypeImageSizing() {
  return (tree: HtmlNode) => {
    const walk = (node: HtmlNode, insideLink = false) => {
      if (node.type === "element" && node.tagName === "img" && node.properties) {
        if (!insideLink) {
          node.properties.tabIndex = 0;
          node.properties.role = "button";
          node.properties.ariaLabel = `放大图片：${node.properties.alt || "正文图片"}`;
        }
        const title = String(node.properties.title || "");
        const match = title.match(/^(?:(.*?) \| )?width=(\d{1,4})(px|%)?$/);
        if (match) {
          const width = Number(match[2]);
          const unit = match[3] || "px";
          if ((unit === "%" && width >= 1 && width <= 100) || (unit === "px" && width >= 16 && width <= 2400)) {
            node.properties.style = `width:${width}${unit}`;
            if (match[1]) node.properties.title = match[1];
            else delete node.properties.title;
          }
        }
      }
      node.children?.forEach((child) => walk(child, insideLink || node.tagName === "a"));
    };
    walk(tree);
  };
}
