import type { App, TFile, Vault } from 'obsidian';
import type { BlogPost } from '../types';
import { extractExcerpt } from '../utils/text';
import { titleToFilename } from '../utils/text';

export function createPostService(app: App) {
  const { vault, metadataCache } = app;

  const parsePost = async (file: TFile, isDraft: boolean): Promise<BlogPost | null> => {
    try {
      const content = await vault.read(file);
      const cache = metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter;

      let title = file.basename.replace(/^\d{4}-\d{2}-\d{2}-/, '');
      let date = '';

      if (frontmatter) {
        if (frontmatter.title) {
          title = String(frontmatter.title);
        }

        if (frontmatter.date) {
          date = String(frontmatter.date);
        }
      }

      const filenameDate = file.name.match(/^(\d{4}-\d{2}-\d{2})/);

      if (!date && filenameDate) {
        date = filenameDate[1];
      }

      const bodyContent = content.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
      const wordCount = bodyContent.split(/\s+/).filter(w => w.length > 0).length;
      const excerpt = extractExcerpt(bodyContent, 20);

      return {
        file,
        filename: file.name,
        title,
        date,
        isDraft,
        wordCount,
        excerpt
      };
    } catch (error) {
      console.error('Error parsing post:', error);
      return null;
    }
  };

  const loadPosts = async (): Promise<BlogPost[]> => {
    const markdownFiles = vault.getMarkdownFiles();

    const blogFiles = markdownFiles.filter(file =>
      file.path.startsWith('_drafts') || file.path.startsWith('_posts')
    );

    const posts: BlogPost[] = [];

    for (const file of blogFiles) {
      const isDraft = file.path.startsWith('_drafts');
      const post = await parsePost(file, isDraft);

      if (post) {
        posts.push(post);
      }
    }

    return posts.sort((a, b) => b.date.localeCompare(a.date));
  };

  const createPost = async (title: string): Promise<TFile> => {
    const draftsFolder = '_drafts';

    if (!vault.getAbstractFileByPath(draftsFolder)) {
      await vault.createFolder(draftsFolder);
    }

    const filename = titleToFilename(title);
    const filepath = `${draftsFolder}/${filename}`;

    const content = `---
title: ${title}
date: ${new Date().toISOString().split('T')[0]}
categories: []
tags: []
---

Write your post here...
`;

    return await vault.create(filepath, content);
  };

  const publishPost = async (file: TFile): Promise<TFile> => {
    const filename = file.name;

    const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})-/);
    let newFilename = filename;

    if (!dateMatch) {
      const today = new Date().toISOString().split('T')[0];
      newFilename = `${today}-${filename}`;
    }

    const newRelativePath = `_posts/${newFilename}`;

    await vault.rename(file, newRelativePath);

    const renamedFile = vault.getAbstractFileByPath(newRelativePath);

    return renamedFile as TFile;
  };

  const unpublishPost = async (file: TFile): Promise<TFile> => {
    const filename = file.name;

    const newFilename = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    const newRelativePath = `_drafts/${newFilename}`;

    await vault.rename(file, newRelativePath);

    const renamedFile = vault.getAbstractFileByPath(newRelativePath);

    return renamedFile as TFile;
  };

  const deletePost = async (file: TFile): Promise<void> => {
    await vault.delete(file);
  };

  return {
    loadPosts,
    parsePost,
    createPost,
    publishPost,
    unpublishPost,
    deletePost
  };
}
