import type { TFile } from 'obsidian';

export interface BlogPost {
  file: TFile;
  filename: string;
  title: string;
  date: string;
  isDraft: boolean;
  wordCount: number;
  excerpt: string;
}

export const VIEW_TYPE_BLOG = 'jekyll-blog-view';
export const VIEW_TYPE_PROPERTIES = 'jekyll-properties-view';
