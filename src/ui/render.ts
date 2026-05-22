import type { BlogPost } from '../types';
import type { TFile } from 'obsidian';
import { formatDate } from '../utils/date';
import { getReadingTime } from '../utils/text';

export function createRenderer() {
  const renderBlogList = (
    container: HTMLElement,
    posts: BlogPost[],
    callbacks: {
      onPostClick: (file: TFile) => void;
      onNewPost: () => void;
    }
  ): void => {
    container.empty();
    container.addClass('jekyll-blog-view');

    const headerEl = container.createDiv({ cls: 'blog-header' });
    headerEl.createEl('h3', { text: 'Writing' });

    const newPostBtn = headerEl.createEl('button', { text: 'New Post', cls: 'mod-cta new-post-btn' });
    newPostBtn.addEventListener('click', callbacks.onNewPost);

    if (posts.length === 0) {
      container.createEl('p', {
        text: 'No posts yet. Click "New Post" to begin writing.',
        cls: 'empty-state'
      });
      return;
    }

    const drafts = posts.filter(p => p.isDraft);
    const published = posts.filter(p => !p.isDraft);

    if (drafts.length > 0) {
      const draftsSection = container.createDiv({ cls: 'posts-section' });
      const sectionHeader = draftsSection.createDiv({ cls: 'section-header' });
      sectionHeader.createEl('span', { text: 'Drafts', cls: 'section-title' });
      sectionHeader.createEl('span', { text: `${drafts.length}`, cls: 'section-count' });

      for (const post of drafts) {
        renderPostItem(draftsSection, post, () => callbacks.onPostClick(post.file));
      }
    }

    if (published.length > 0) {
      const publishedSection = container.createDiv({ cls: 'posts-section' });
      const sectionHeader = publishedSection.createDiv({ cls: 'section-header' });
      sectionHeader.createEl('span', { text: 'Published', cls: 'section-title' });
      sectionHeader.createEl('span', { text: `${published.length}`, cls: 'section-count' });

      for (const post of published) {
        renderPostItem(publishedSection, post, () => callbacks.onPostClick(post.file));
      }
    }
  };

  const renderPostItem = (
    container: HTMLElement,
    post: BlogPost,
    onClick: () => void
  ): void => {
    const postEl = container.createDiv({ cls: 'post-item' });
    postEl.addEventListener('click', onClick);

    const titleEl = postEl.createDiv({ cls: 'post-title' });
    titleEl.createEl('span', { text: post.title });

    if (post.excerpt) {
      const excerptEl = postEl.createDiv({ cls: 'post-excerpt' });
      excerptEl.createEl('span', { text: post.excerpt });
    }

    const metaEl = postEl.createDiv({ cls: 'post-meta' });
    const dateText = formatDate(post.date);
    const readingTime = getReadingTime(post.wordCount);
    metaEl.createEl('span', { text: `${dateText} · ${readingTime}` });
  };

  const getPropertyIcon = (key: string): string => {
    const icons: Record<string, string> = {
      'title': '📝',
      'date': '📅',
      'categories': '📁',
      'tags': '🏷️'
    };
    return icons[key] || '•';
  };

  const getPropertyLabel = (key: string): string => {
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  const renderProperty = (
    container: HTMLElement,
    key: string,
    value: any
  ): HTMLElement => {
    const propRow = container.createDiv({ cls: 'property-row' });

    const icon = getPropertyIcon(key);
    const label = getPropertyLabel(key);

    const labelEl = propRow.createEl('label', {
      text: `${icon} ${label}`,
      cls: 'property-label'
    });

    if (key === 'date') {
      const input = propRow.createEl('input', {
        type: 'date',
        value: value,
        cls: 'property-input'
      });
      input.setAttribute('data-property-key', key);
      input.setAttribute('data-property-type', 'string');
    } else if (Array.isArray(value)) {
      const input = propRow.createEl('input', {
        type: 'text',
        value: value.join(', '),
        cls: 'property-input',
        placeholder: `Enter ${label.toLowerCase()}...`
      });
      input.setAttribute('data-property-key', key);
      input.setAttribute('data-property-type', 'array');
    } else {
      const input = propRow.createEl('input', {
        type: 'text',
        value: value,
        cls: 'property-input',
        placeholder: `Enter ${label.toLowerCase()}...`
      });
      input.setAttribute('data-property-key', key);
      input.setAttribute('data-property-type', 'string');
    }

    return propRow;
  };

  const renderTagsPills = (
    container: HTMLElement,
    tags: string[],
    allTags: Set<string>
  ): HTMLElement => {
    const tagsArray = Array.isArray(tags) ? tags : [];

    const pillsContainer = container.createDiv({ cls: 'tags-pills-container' });
    pillsContainer.setAttribute('data-property-key', 'tags');
    pillsContainer.setAttribute('data-property-type', 'array');

    const renderPills = () => {
      pillsContainer.empty();

      tagsArray.forEach((tag, index) => {
        const pill = pillsContainer.createDiv({ cls: 'tag-pill' });
        pill.createEl('span', { text: tag, cls: 'tag-text' });

        const removeBtn = pill.createEl('span', { text: '×', cls: 'tag-remove' });
        removeBtn.addEventListener('click', () => {
          tagsArray.splice(index, 1);
          renderPills();
        });
      });

      const inputWrapper = pillsContainer.createDiv({ cls: 'tag-input-wrapper' });
      const input = inputWrapper.createEl('input', {
        type: 'text',
        cls: 'tag-input',
        placeholder: tagsArray.length === 0 ? 'Add tags...' : ''
      });

      const datalist = inputWrapper.createEl('datalist', { attr: { id: 'tags-suggestions' } });
      allTags.forEach(tag => {
        if (!tagsArray.includes(tag)) {
          datalist.createEl('option', { attr: { value: tag } });
        }
      });
      input.setAttribute('list', 'tags-suggestions');

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          e.preventDefault();
          const newTag = input.value.trim();
          if (!tagsArray.includes(newTag)) {
            tagsArray.push(newTag);
            renderPills();
          }
        }
      });
    };

    renderPills();

    return pillsContainer;
  };

  const renderCategoriesDropdown = (
    container: HTMLElement,
    categories: string[],
    allCategories: Set<string>
  ): HTMLElement => {
    const categoriesArray = Array.isArray(categories) ? categories : [];

    const selectContainer = container.createDiv({ cls: 'categories-container' });
    selectContainer.setAttribute('data-property-key', 'categories');
    selectContainer.setAttribute('data-property-type', 'array');

    const input = selectContainer.createEl('input', {
      type: 'text',
      cls: 'property-input',
      value: categoriesArray.join(', '),
      placeholder: 'Select or type categories...'
    });

    const datalist = selectContainer.createEl('datalist', { attr: { id: 'categories-suggestions' } });
    allCategories.forEach(cat => {
      datalist.createEl('option', { attr: { value: cat } });
    });
    input.setAttribute('list', 'categories-suggestions');

    return selectContainer;
  };

  return {
    renderBlogList,
    renderPostItem,
    renderProperty,
    renderTagsPills,
    renderCategoriesDropdown
  };
}
