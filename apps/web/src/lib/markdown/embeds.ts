import { imageSettingsStyle, parseImageSettings, type ImageSettings } from "./image-sizing";

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  position?: { start: { offset?: number } };
};

// Same loose shape as image-sizing.ts; unified expects unist-compatible nodes.
type HtmlNode = HastNode;

type ProviderEmbed = { kind: "video" | "music"; src: string; height?: number };

const VIDEO_FILE = /\.(mp4|webm|m4v|mov)$/i;
const AUDIO_FILE = /\.(mp3|m4a|aac|wav|ogg|oga|flac)$/i;

// NetEase outchain player: song=2 (66px bar), album=1 / playlist=0 (330px list).
const NETEASE_OUTCHAIN: Record<string, [number, number]> = { song: [2, 66], album: [1, 330], playlist: [0, 330] };

const IFRAME_ALLOW: Record<"video" | "music", string> = {
  video: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
  music: "autoplay; encrypted-media; picture-in-picture",
};

function httpUrl(href: string): URL | null {
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

const SITE_HOSTS = new Set(["guyong.site", "www.guyong.site", "localhost", "127.0.0.1"]);

// Off-site article links open in a new tab so reading flow stays on the site.
function decorateExternalLink(node: HastNode): HastNode {
  const url = httpUrl(String(node.properties?.href ?? ""));
  if (!url || SITE_HOSTS.has(url.hostname)) return node;
  return { ...node, properties: { ...node.properties, target: "_blank", rel: "noopener noreferrer" } };
}

// Only allowlisted providers turn into iframes; every other link stays a link.
function resolveProviderEmbed(href: string): ProviderEmbed | null {  const url = httpUrl(href);
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, "");

  if (host === "music.163.com" || host === "y.music.163.com") {
    // Share links carry the id in the query; SPA share links put it in the hash.
    const combined = `${url.pathname}${url.search}${url.hash}`;
    const kind = combined.match(/\/(song|album|playlist)/)?.[1];
    const id = combined.match(/[?&]id=(\d+)/)?.[1];
    if (kind && id && NETEASE_OUTCHAIN[kind]) {
      const [type, height] = NETEASE_OUTCHAIN[kind];
      return { kind: "music", src: `https://music.163.com/outchain/player?type=${type}&id=${id}&auto=1&height=${height}`, height };
    }
    return null;
  }

  if (host === "bilibili.com" || host === "m.bilibili.com") {
    const match = url.pathname.match(/^\/video\/(BV[0-9A-Za-z]{8,}|av\d+)/i);
    if (match) {
      const param = /^bv/i.test(match[1]) ? `bvid=${match[1]}` : `aid=${match[1].slice(2)}`;
      return { kind: "video", src: `https://player.bilibili.com/player.html?${param}&autoplay=0` };
    }
    return null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    const id = host === "youtu.be"
      ? url.pathname.slice(1)
      : url.searchParams.get("v") || url.pathname.match(/^\/(?:shorts|embed|live)\/([0-9A-Za-z_-]{6,})/)?.[1] || "";
    if (/^[0-9A-Za-z_-]{6,}$/.test(id)) {
      return { kind: "video", src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
  }

  return null;
}

// Media files render as native players: local draft/site assets, or remote https URLs.
function resolveMediaFile(src: string): "video" | "audio" | null {
  if (!src) return null;
  if (/^(?:\.\/)?assets\//.test(src)) {
    if (VIDEO_FILE.test(src)) return "video";
    if (AUDIO_FILE.test(src)) return "audio";
    return null;
  }
  const url = httpUrl(src);
  if (!url || url.protocol !== "https:") return null;
  if (VIDEO_FILE.test(url.pathname)) return "video";
  if (AUDIO_FILE.test(url.pathname)) return "audio";
  return null;
}

function element(tagName: string, properties: Record<string, unknown> = {}, children: HastNode[] = []): HastNode {
  return { type: "element", tagName, properties, children };
}

function isBlankText(node: HastNode): boolean {
  return node.type === "text" && !String(node.value ?? "").trim();
}

function buildProviderEmbed(embed: ProviderEmbed, settings: ImageSettings): HastNode {
  const style: string[] = [];
  if (settings.width) style.push(`width:${settings.width.value}${settings.width.unit}`);
  if (embed.kind === "music" && embed.height) style.push(`height:${embed.height}px`);
  const iframe = element("iframe", {
    src: embed.src,
    loading: "lazy",
    allow: IFRAME_ALLOW[embed.kind],
    referrerPolicy: "strict-origin-when-cross-origin",
    ...(embed.kind === "video" ? { allowFullScreen: true } : {}),
    title: settings.caption || (embed.kind === "music" ? "网易云音乐播放器" : "视频播放器"),
  });
  return element("div", {
    className: ["media-embed", embed.kind === "music" ? "media-embed--music" : "media-embed--video"],
    ...(style.length ? { style: style.join(";") } : {}),
  }, [iframe]);
}

function buildMediaElement(node: HastNode, kind: "video" | "audio"): HastNode {
  const settings = parseImageSettings(String(node.properties?.title ?? ""));
  const style = imageSettingsStyle(settings);
  const properties: Record<string, unknown> = {
    src: node.properties?.src,
    controls: true,
    preload: "metadata",
    ...(style ? { style } : {}),
  };
  const alt = String(node.properties?.alt ?? "");
  if (alt) properties.ariaLabel = alt;
  return element(kind, properties);
}

// Sibling images separated by whitespace in one paragraph share a wrapping row.
function groupImageRows(children: HastNode[]): HastNode[] {
  const result: HastNode[] = [];
  let run: HastNode[] = [];
  const flush = () => {
    if (run.length >= 2) result.push(element("span", { className: ["img-row"] }, run));
    else result.push(...run);
    run = [];
  };
  for (const child of children) {
    if (child.type === "element" && child.tagName === "img") {
      run.push(child);
    } else if (run.length > 0 && isBlankText(child)) {
      continue;
    } else {
      flush();
      result.push(child);
    }
  }
  flush();
  return result;
}

export function rehypeMediaEmbed() {
  const map = (node: HastNode, insideLink: boolean): HastNode => {
    if (node.type === "text" || node.type === "comment" || node.type === "doctype") return node;

    if (node.tagName === "img" && !insideLink) {
      const kind = resolveMediaFile(String(node.properties?.src ?? ""));
      if (kind) return buildMediaElement(node, kind);
      return node;
    }

    const self = node.tagName === "a" && !insideLink ? decorateExternalLink(node) : node;
    const linked = insideLink || self.tagName === "a";
    const children = (self.children ?? []).map((child) => map(child, linked));

    if (self.tagName === "p") {
      const meaningful = children.filter((child) => !isBlankText(child));
      if (meaningful.length === 1 && meaningful[0].type === "element" && meaningful[0].tagName === "a") {
        const embed = resolveProviderEmbed(String(meaningful[0].properties?.href ?? ""));
        if (embed) {
          return buildProviderEmbed(embed, parseImageSettings(String(meaningful[0].properties?.title ?? "")));
        }
      }
      return { ...self, children: groupImageRows(children) };
    }

    return { ...self, children };
  };
  return (tree: HtmlNode) => {
    const mapped = map(tree, false);
    if (mapped !== tree) Object.assign(tree, mapped);
  };
}
