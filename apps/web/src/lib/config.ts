export const siteConfig = {
  name: "GUYONG / INDEX",
  description: "Guyong 的个人内容索引：笔记、课程与少量创作。",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://guyong.site",
  locale: "zh-CN",
  sections: [
    { title: "Notes", href: "/notes" },
    { title: "Courses", href: "/courses" },
    { title: "Gallery", href: "/gallery" },
  ],
};
