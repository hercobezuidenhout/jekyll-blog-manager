export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const extractDateFromFilename = (filename: string): string | null => {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
};

export const addDatePrefix = (filename: string): string => {
  const today = new Date().toISOString().split('T')[0];
  return `${today}-${filename}`;
};
