export const siteConfig = {
  name: "GUYONG",
  description: "Guyong 的个人网站：技术笔记、课程学习记录与少量画作。",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://guyong.site",
  locale: "zh-CN",
  sections: [
    { title: "Notes", href: "/notes" },
    { title: "Gallery", href: "/gallery" },
    { title: "Account", href: "/account" },
  ],
};
