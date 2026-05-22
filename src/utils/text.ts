export const getReadingTime = (wordCount: number): string => {
  const minutes = Math.ceil(wordCount / 200);
  return minutes === 1 ? '1 min read' : `${minutes} min read`;
};

export const titleToFilename = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '.md';
};

export const extractExcerpt = (content: string, wordLimit: number = 20): string => {
  const words = content.split(/\s+/).filter(w => w.length > 0);
  return words.slice(0, wordLimit).join(' ') + (words.length > wordLimit ? '...' : '');
};
