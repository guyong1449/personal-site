export const contentKinds = ["notes", "courses", "gallery"] as const;

export type ContentKind = (typeof contentKinds)[number];

export type ContentListItem = {
  kind: ContentKind;
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  cover: string | null;
  updated: string | null;
  course: string | null;
  week: string | null;
  artCategory: string | null;
  series: string | null;
};

export type ContentDocument = ContentListItem & {
  body: string;
  created: string | null;
  contentType: string | null;
};
