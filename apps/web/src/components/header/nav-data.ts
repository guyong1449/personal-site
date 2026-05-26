export type NavItem = {
  title: string;
  href: string;
  description?: string;
};

export const mainNavItems: NavItem[] = [
  {
    title: "Notes",
    href: "/notes",
    description: "学习笔记和技术文档",
  },
  {
    title: "Courses",
    href: "/courses",
    description: "课程内容和学习材料",
  },
  {
    title: "Gallery",
    href: "/gallery",
    description: "作品展示和创意内容",
  },
];

export const socialLinks = [
  {
    title: "GitHub",
    href: "https://github.com",
    icon: "github",
  },
  {
    title: "X",
    href: "https://x.com",
    icon: "x",
  },
  {
    title: "小红书",
    href: "https://xiaohongshu.com",
    icon: "xiaohongshu",
  },
];
