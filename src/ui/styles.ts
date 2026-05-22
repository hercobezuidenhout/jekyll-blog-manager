export const injectBlogListStyles = (): void => {
  const styleEl = document.getElementById('jekyll-blog-styles');
  if (styleEl) return;

  const style = document.createElement('style');
  style.id = 'jekyll-blog-styles';
  style.textContent = `
    .jekyll-blog-view {
      padding: 16px;
    }
    .blog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .blog-header h3 {
      margin: 0;
      font-size: 1.5em;
      font-weight: 600;
      color: var(--text-normal);
    }
    .new-post-btn {
      font-size: 0.9em;
    }
    .posts-section {
      margin-bottom: 32px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--background-modifier-border);
    }
    .section-title {
      font-size: 0.85em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }
    .section-count {
      font-size: 0.85em;
      color: var(--text-muted);
    }
    .post-item {
      padding: 12px 16px;
      margin-bottom: 4px;
      cursor: pointer;
      border-radius: 4px;
      transition: background-color 0.15s ease;
    }
    .post-item:hover {
      background: var(--background-modifier-hover);
    }
    .post-title {
      font-size: 1.05em;
      font-weight: 500;
      color: var(--text-normal);
      margin-bottom: 6px;
      line-height: 1.4;
    }
    .post-excerpt {
      font-size: 0.9em;
      color: var(--text-muted);
      margin-bottom: 6px;
      line-height: 1.5;
    }
    .post-meta {
      font-size: 0.85em;
      color: var(--text-faint);
    }
    .empty-state {
      text-align: center;
      color: var(--text-muted);
      padding: 48px 20px;
      font-size: 0.95em;
    }
  `;
  document.head.appendChild(style);
};

export const injectPropertiesStyles = (): void => {
  const styleEl = document.getElementById('jekyll-properties-styles');
  if (styleEl) return;

  const style = document.createElement('style');
  style.id = 'jekyll-properties-styles';
  style.textContent = `
    .jekyll-properties-view {
      padding: 16px;
    }
    .status-card {
      background: var(--background-secondary);
      border-radius: 8px;
      padding: 0;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .status-info {
      margin-bottom: 24px;
    }
    .status-label {
      font-size: 0.85em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .status-label.draft {
      color: var(--text-muted);
    }
    .status-label.published {
      color: var(--text-accent);
    }
    .status-text {
      font-size: 0.95em;
      color: var(--text-muted);
    }
    .property-section {
      margin-bottom: 28px;
    }
    .section-title {
      font-size: 0.85em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .property-row {
      margin-bottom: 16px;
    }
    .property-label {
      display: block;
      font-size: 0.9em;
      font-weight: 500;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .property-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      background: var(--background-primary);
      color: var(--text-normal);
      font-size: 0.95em;
      transition: border-color 0.15s ease;
    }
    .property-input:focus {
      outline: none;
      border-color: var(--interactive-accent);
    }
    .property-input::placeholder {
      color: var(--text-faint);
    }
    .tags-pills-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      background: var(--background-primary);
      min-height: 42px;
      align-items: center;
    }
    .tag-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: var(--background-modifier-hover);
      border-radius: 4px;
      font-size: 0.85em;
    }
    .tag-text {
      color: var(--text-normal);
    }
    .tag-remove {
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1.2em;
      line-height: 1;
      transition: color 0.15s ease;
    }
    .tag-remove:hover {
      color: var(--text-error);
    }
    .tag-input-wrapper {
      flex: 1;
      min-width: 100px;
    }
    .tag-input {
      border: none;
      background: transparent;
      outline: none;
      padding: 4px;
      font-size: 0.9em;
      color: var(--text-normal);
      width: 100%;
    }
    .tag-input::placeholder {
      color: var(--text-faint);
    }
    .categories-container {
      position: relative;
    }
    .actions-section {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid var(--background-modifier-border);
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
    }
    .action-link {
      font-size: 0.9em;
      color: var(--text-muted);
      cursor: pointer;
      text-decoration: none;
      transition: color 0.15s ease;
      font-weight: 400;
    }
    .action-link:hover {
      color: var(--text-normal);
    }
    .action-link.primary {
      color: var(--interactive-accent);
    }
    .action-link.primary:hover {
      color: var(--interactive-accent-hover);
    }
    .action-link.danger {
      color: var(--text-faint);
    }
    .action-link.danger:hover {
      color: var(--text-error);
    }
    .empty-state {
      text-align: center;
      color: var(--text-muted);
      padding: 48px 20px;
      font-size: 0.95em;
    }
  `;
  document.head.appendChild(style);
};

export const removeStyles = (id: string): void => {
  const style = document.getElementById(id);
  if (style) {
    style.remove();
  }
};
