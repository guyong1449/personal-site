export const siteConfig = {
  name: "Personal Site",
  description: "Public publishing pipeline preview site.",
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
