export interface GuideStat {
  v: string;
  l: string;
}

export interface GuideArticle {
  id: string;
  cat: 'learn' | 'career' | 'interview';
  icon: string;
  grad: [string, string];
  minutes: number;
  tag: string;
  title: string;
  intro: string;
  /** 3 data points rendered as the article infographic */
  stats: GuideStat[];
  /** key takeaways rendered as checklist card */
  points: string[];
  body: string[];
}
