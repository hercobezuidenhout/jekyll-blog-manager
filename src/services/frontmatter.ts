export const parseFrontmatter = (content: string): Record<string, any> => {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) return {};

  const frontmatter = frontmatterMatch[1];
  const lines = frontmatter.split('\n');
  const properties: Record<string, any> = {};

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let valueStr = match[2].trim();
      let value: string | string[] = valueStr;

      if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
        value = valueStr.slice(1, -1).split(',').map(v => v.trim());
      }

      properties[key] = value;
    }
  }

  return properties;
};

export const updateProperty = (content: string, key: string, value: any): string => {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) return content;

  let frontmatter = frontmatterMatch[1];
  const lines = frontmatter.split('\n');
  const newLines = [];

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match && match[1].trim() === key) {
      if (Array.isArray(value)) {
        newLines.push(`${key}: [${value.join(', ')}]`);
      } else {
        newLines.push(`${key}: ${value}`);
      }
    } else {
      newLines.push(line);
    }
  }

  const newFrontmatter = newLines.join('\n');
  return content.replace(/^---\n[\s\S]*?\n---/, `---\n${newFrontmatter}\n---`);
};

export const updateMultipleProperties = (content: string, updates: Record<string, any>): string => {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) return content;

  let frontmatter = frontmatterMatch[1];
  const lines = frontmatter.split('\n');
  const newLines = [];

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      if (updates.hasOwnProperty(key)) {
        if (Array.isArray(updates[key])) {
          newLines.push(`${key}: [${updates[key].join(', ')}]`);
        } else {
          newLines.push(`${key}: ${updates[key]}`);
        }
      } else {
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  }

  const newFrontmatter = newLines.join('\n');
  return content.replace(/^---\n[\s\S]*?\n---/, `---\n${newFrontmatter}\n---`);
};
