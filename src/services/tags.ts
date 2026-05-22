import type { TFile, MetadataCache } from 'obsidian';

export function createTagService(metadataCache: MetadataCache) {
  const getAllTagsAndCategories = async (
    files: TFile[]
  ): Promise<{ tags: Set<string>, categories: Set<string> }> => {
    const tags = new Set<string>();
    const categories = new Set<string>();

    for (const file of files) {
      const cache = metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter;
      if (!frontmatter) continue;

      if (Array.isArray(frontmatter.tags)) {
        frontmatter.tags.forEach(tag => {
          if (tag) tags.add(String(tag));
        });
      }

      if (Array.isArray(frontmatter.categories)) {
        frontmatter.categories.forEach(category => {
          if (category) categories.add(String(category));
        });
      }
    }

    return { tags, categories };
  };

  const getAllTags = async (files: TFile[]): Promise<Set<string>> => {
    const { tags } = await getAllTagsAndCategories(files);
    return tags;
  };

  const getAllCategories = async (files: TFile[]): Promise<Set<string>> => {
    const { categories } = await getAllTagsAndCategories(files);
    return categories;
  };

  return { getAllTagsAndCategories, getAllTags, getAllCategories };
}
