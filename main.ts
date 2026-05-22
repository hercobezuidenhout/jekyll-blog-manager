import { App, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf, Notice, TFile, Modal } from 'obsidian';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface BlogPost {
  file: TFile;
  filename: string;
  title: string;
  date: string;
  isDraft: boolean;
  wordCount: number;
  excerpt: string;
}

export default class JekyllBlogManagerPlugin extends Plugin {
  async onload() {

    this.registerView(
      'jekyll-blog-view',
      (leaf) => new JekyllBlogView(leaf, this)
    );

    this.registerView(
      'jekyll-properties-view',
      (leaf) => new JekyllPropertiesView(leaf, this)
    );

    this.addRibbonIcon('newspaper', 'Jekyll Blog Manager', () => {
      this.activateView();
    });

    this.addCommand({
      id: 'open-jekyll-blog-view',
      name: 'Open Blog Manager',
      callback: () => {
        this.activateView();
      }
    });

    this.addSettingTab(new JekyllBlogSettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      this.configureMinimalWorkspace();
      this.activateView();
      this.activatePropertiesView();
    });

    this.registerEvent(
      this.app.vault.on('create', () => {
        this.refreshViews();
      })
    );
    this.registerEvent(
      this.app.vault.on('modify', () => {
        this.refreshViews();
      })
    );
    this.registerEvent(
      this.app.vault.on('rename', () => {
        this.refreshViews();
      })
    );
    this.registerEvent(
      this.app.vault.on('delete', () => {
        this.refreshViews();
      })
    );

  }

  async refreshViews() {
    const blogLeaves = this.app.workspace.getLeavesOfType('jekyll-blog-view');
    for (const leaf of blogLeaves) {
      const view = leaf.view as JekyllBlogView;
      await view.refresh();
    }
    const propertyLeaves = this.app.workspace.getLeavesOfType('jekyll-properties-view');
    for (const leaf of propertyLeaves) {
      const view = leaf.view as JekyllPropertiesView;
      await view.updateProperties();
    }
  }


  configureMinimalWorkspace() {
    const leftRibbon = document.querySelector('.side-dock-ribbon.mod-left');
    if (leftRibbon) {
      (leftRibbon as HTMLElement).style.display = 'none';
    }

    const statusBar = document.querySelector('.status-bar');
    if (statusBar) {
      (statusBar as HTMLElement).style.display = 'none';
    }

    const style = document.createElement('style');
    style.id = 'jekyll-minimal-workspace';
    style.textContent = `
      .view-header .view-actions {
        visibility: hidden !important;
      }
      .clickable-icon {
        visibility: hidden !important;
      }
      .workspace-tab-header-container-inner {
        display: none !important;
      }
      .metadata-container {
        display: none !important;
      }
      .frontmatter-container {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  async activatePropertiesView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType('jekyll-properties-view');

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({ type: 'jekyll-properties-view', active: true });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  onunload() {
    this.app.workspace.detachLeavesOfType('jekyll-blog-view');
    this.app.workspace.detachLeavesOfType('jekyll-properties-view');
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType('jekyll-blog-view');

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getLeftLeaf(false);
      if (leaf) {
        await leaf.setViewState({ type: 'jekyll-blog-view', active: true });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
}

class JekyllBlogView extends ItemView {
  plugin: JekyllBlogManagerPlugin;
  posts: BlogPost[] = [];

  constructor(leaf: WorkspaceLeaf, plugin: JekyllBlogManagerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return 'jekyll-blog-view';
  }

  getDisplayText() {
    return 'Jekyll Blog Manager';
  }

  getIcon() {
    return 'newspaper';
  }

  async onOpen() {
    await this.refresh();
  }

  async onClose() {
  }

  async refresh() {
    await this.loadPosts();
    this.render();
  }

  async loadPosts() {
    const markdownFiles = this.app.vault.getMarkdownFiles();

    const blogFiles = markdownFiles.filter(file =>
      file.path.startsWith('_drafts') ||
      file.path.startsWith('_posts')
    );

    this.posts = [];

    for (const file of blogFiles) {
      const isDraft = file.path.startsWith('_drafts');

      const post = await this.parsePost(file, isDraft);

      if (post) {
        this.posts.push(post);
      }
    }

    this.posts.sort((a, b) => b.date.localeCompare(a.date));
  }

  async parsePost(file: TFile, isDraft: boolean): Promise<BlogPost | null> {
    try {
      const content = await this.app.vault.read(file);
      const cache = this.app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter;
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

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

      const words = bodyContent.split(/\s+/).filter(w => w.length > 0);
      const excerpt = words.slice(0, 20).join(' ') + (words.length > 20 ? '...' : '');

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
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  getReadingTime(wordCount: number): string {
    const minutes = Math.ceil(wordCount / 200);
    return minutes === 1 ? '1 min read' : `${minutes} min read`;
  }

  render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('jekyll-blog-view');

    const headerEl = container.createDiv({ cls: 'blog-header' });
    headerEl.createEl('h3', { text: 'Writing' });

    const newPostBtn = headerEl.createEl('button', { text: 'New Post', cls: 'mod-cta new-post-btn' });
    newPostBtn.addEventListener('click', async () => {
      await this.createNewPost();
    });

    if (this.posts.length === 0) {
      container.createEl('p', {
        text: 'No posts yet. Click "New Post" to begin writing.',
        cls: 'empty-state'
      });
      return;
    }

    const drafts = this.posts.filter(p => p.isDraft);
    const published = this.posts.filter(p => !p.isDraft);

    if (drafts.length > 0) {
      const draftsSection = container.createDiv({ cls: 'posts-section' });
      const sectionHeader = draftsSection.createDiv({ cls: 'section-header' });
      sectionHeader.createEl('span', { text: 'Drafts', cls: 'section-title' });
      sectionHeader.createEl('span', { text: `${drafts.length}`, cls: 'section-count' });

      for (const post of drafts) {
        this.renderPost(draftsSection, post);
      }
    }

    if (published.length > 0) {
      const publishedSection = container.createDiv({ cls: 'posts-section' });
      const sectionHeader = publishedSection.createDiv({ cls: 'section-header' });
      sectionHeader.createEl('span', { text: 'Published', cls: 'section-title' });
      sectionHeader.createEl('span', { text: `${published.length}`, cls: 'section-count' });

      for (const post of published) {
        this.renderPost(publishedSection, post);
      }
    }

    this.addStyles();
  }

  renderPost(container: HTMLElement, post: BlogPost) {
    const postEl = container.createDiv({ cls: 'post-item' });
    postEl.addEventListener('click', () => {
      this.openPostInEditor(post.file);
    });

    const titleEl = postEl.createDiv({ cls: 'post-title' });
    titleEl.createEl('span', { text: post.title });

    if (post.excerpt) {
      const excerptEl = postEl.createDiv({ cls: 'post-excerpt' });
      excerptEl.createEl('span', { text: post.excerpt });
    }

    const metaEl = postEl.createDiv({ cls: 'post-meta' });
    const dateText = this.formatDate(post.date);
    const readingTime = this.getReadingTime(post.wordCount);
    metaEl.createEl('span', { text: `${dateText} · ${readingTime}` });
  }

  async openPostInEditor(file: TFile) {
    try {
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(file);
    } catch (error) {
      console.error('Failed to open file:', error);
      new Notice('Failed to open file');
    }
  }

  async createNewPost() {
    try {
      const title = await this.promptForTitle();
      if (!title) return;

      const draftsFolder = '_drafts';

      if (!this.app.vault.getAbstractFileByPath(draftsFolder)) {
        await this.app.vault.createFolder(draftsFolder);
      }

      const filename = this.titleToFilename(title);
      const filepath = `${draftsFolder}/${filename}`;

      const content = `---
title: ${title}
date: ${new Date().toISOString().split('T')[0]}
categories: []
tags: []
---

Write your post here...
`;

      const file = await this.app.vault.create(filepath, content);
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(file);
      await this.refresh();
      new Notice(`Created draft: ${title}`);
    } catch (error) {
      console.error('Create post error:', error);
      new Notice(`Failed to create post: ${error.message}`);
    }
  }

  async promptForTitle(): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = new TitleInputModal(this.app, (title) => {
        resolve(title || null);
      });
      modal.open();
    });
  }

  titleToFilename(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '.md';
  }

  addStyles() {
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
  }
}

class JekyllPropertiesView extends ItemView {
  plugin: JekyllBlogManagerPlugin;
  currentFile: TFile | null = null;
  properties: Record<string, any> = {};
  isRefreshing: boolean = false;
  allTags: Set<string> = new Set();
  allCategories: Set<string> = new Set();

  constructor(leaf: WorkspaceLeaf, plugin: JekyllBlogManagerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return 'jekyll-properties-view';
  }

  getDisplayText() {
    return 'Post Properties';
  }

  getIcon() {
    return 'settings';
  }

  async onOpen() {
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        this.updateProperties();
      })
    );

    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file === this.currentFile) {
          this.updateProperties();
        }
      })
    );

    await this.updateProperties();
  }

  async onClose() {
  }

  async updateProperties() {
    const activeFile = this.app.workspace.getActiveFile();

    if (!activeFile || (!activeFile.path.startsWith('_posts/') && !activeFile.path.startsWith('_drafts/'))) {
      this.currentFile = null;
      this.properties = {};
      this.render();
      return;
    }

    this.currentFile = activeFile;
    await this.loadProperties();
    this.render();
  }

  async loadProperties() {
    if (!this.currentFile) return;

    try {
      const content = await this.app.vault.read(this.currentFile);
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const lines = frontmatter.split('\n');

        this.properties = {};
        for (const line of lines) {
          const match = line.match(/^([^:]+):\s*(.*)$/);
          if (match) {
            const key = match[1].trim();
            let valueStr = match[2].trim();
            let value: string | string[] = valueStr;

            if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
              value = valueStr.slice(1, -1).split(',').map(v => v.trim());
            }

            this.properties[key] = value;
          }
        }
      }

      await this.loadAllTagsAndCategories();
    } catch (error) {
      console.error('Failed to load properties:', error);
    }
  }

  async loadAllTagsAndCategories() {
    this.allTags.clear();
    this.allCategories.clear();
    const files = this.app.vault.getMarkdownFiles();
    const blogFiles = files.filter(file =>
      file.path.startsWith('_drafts/') ||
      file.path.startsWith('_posts/')
    );
    for (const file of blogFiles) {
      const cache = this.app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter;
      if (!frontmatter) continue;
      const tags = frontmatter.tags;
      const categories = frontmatter.categories;
      if (Array.isArray(tags)) {
        tags.forEach(tag => {
          if (tag) {
            this.allTags.add(String(tag));
          }
        });
      }
      if (Array.isArray(categories)) {
        categories.forEach(category => {
          if (category) {
            this.allCategories.add(String(category));
          }
        });
      }
    }
  }

  formatDateForDisplay(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('jekyll-properties-view');

    if (!this.currentFile) {
      container.createEl('p', {
        text: 'Open a blog post to see details',
        cls: 'empty-state'
      });
      return;
    }

    const isPublished = this.currentFile.path.startsWith('_posts/');

    const statusEl = container.createDiv({ cls: 'status-info' });

    if (isPublished) {
      const dateText = this.formatDateForDisplay(this.properties['date']);
      statusEl.createEl('div', { text: 'Published', cls: 'status-label published' });
      if (dateText) {
        statusEl.createEl('div', { text: dateText, cls: 'status-text' });
      }
    } else {
      statusEl.createEl('div', { text: 'Draft', cls: 'status-label draft' });
      statusEl.createEl('div', { text: 'Not yet published', cls: 'status-text' });
    }

    const postInfoSection = container.createDiv({ cls: 'property-section' });
    postInfoSection.createEl('div', { text: 'Post Info', cls: 'section-title' });

    const postInfoProps = ['title', 'date'];
    for (const key of postInfoProps) {
      if (this.properties[key] !== undefined) {
        this.renderProperty(postInfoSection, key, this.properties[key]);
      }
    }

    const orgSection = container.createDiv({ cls: 'property-section' });
    orgSection.createEl('div', { text: 'Organization', cls: 'section-title' });

    const orgProps = ['categories', 'tags'];
    for (const key of orgProps) {
      if (this.properties[key] !== undefined) {
        this.renderProperty(orgSection, key, this.properties[key]);
      }
    }

    const actionsSection = container.createDiv({ cls: 'actions-section' });

    if (isPublished) {
      const unpublishLink = actionsSection.createEl('a', {
        text: '→ Unpublish',
        cls: 'action-link'
      });
      unpublishLink.addEventListener('click', async (e) => {
        e.preventDefault();
        unpublishLink.textContent = '→ Unpublishing...';
        await this.unpublishPost();
        unpublishLink.textContent = '→ Unpublish';
      });
    } else {
      const publishLink = actionsSection.createEl('a', {
        text: '→ Publish',
        cls: 'action-link primary'
      });
      publishLink.addEventListener('click', async (e) => {
        e.preventDefault();
        publishLink.textContent = '→ Publishing...';
        await this.publishPostFromProperties();
        publishLink.textContent = '→ Publish';
      });
    }

    const saveLink = actionsSection.createEl('a', {
      text: '→ Save',
      cls: 'action-link'
    });
    saveLink.addEventListener('click', async (e) => {
      e.preventDefault();
      saveLink.textContent = '→ Saving...';
      await this.saveAllProperties();
      saveLink.textContent = '→ Save';
    });

    const deleteLink = actionsSection.createEl('a', {
      text: '→ Delete',
      cls: 'action-link danger'
    });
    deleteLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.deletePost();
    });

    this.addPropertiesStyles();
  }

  renderProperty(container: HTMLElement, key: string, value: any) {
    const propRow = container.createDiv({ cls: 'property-row' });

    const icon = this.getPropertyIcon(key);
    const label = this.getPropertyLabel(key);

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
    } else if (key === 'tags') {
      this.renderTagsPills(propRow, value);
    } else if (key === 'categories') {
      this.renderCategoriesDropdown(propRow, value);
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
  }

  renderTagsPills(container: HTMLElement, tags: string[]) {
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
      this.allTags.forEach(tag => {
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
  }

  renderCategoriesDropdown(container: HTMLElement, categories: string[]) {
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
    this.allCategories.forEach(cat => {
      datalist.createEl('option', { attr: { value: cat } });
    });
    input.setAttribute('list', 'categories-suggestions');
  }

  getPropertyIcon(key: string): string {
    const icons: Record<string, string> = {
      'title': '📝',
      'date': '📅',
      'categories': '📁',
      'tags': '🏷️'
    };
    return icons[key] || '•';
  }

  getPropertyLabel(key: string): string {
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  async updateProperty(key: string, value: any) {
    if (!this.currentFile) return;

    try {
      const content = await this.app.vault.read(this.currentFile);
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (frontmatterMatch) {
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
        const newContent = content.replace(/^---\n[\s\S]*?\n---/, `---\n${newFrontmatter}\n---`);

        await this.app.vault.modify(this.currentFile, newContent);
        new Notice(`Updated ${key}`);
      }
    } catch (error) {
      console.error('Failed to update property:', error);
      new Notice('Failed to update property');
    }
  }

  async saveAllProperties() {
    if (!this.currentFile) return;

    try {
      const container = this.containerEl.children[1];
      const updates: Record<string, any> = {};

      const inputs = container.querySelectorAll('input[data-property-key]');
      inputs.forEach((input: HTMLInputElement) => {
        const key = input.getAttribute('data-property-key');
        const type = input.getAttribute('data-property-type');

        if (key) {
          if (type === 'array') {
            updates[key] = input.value.split(',').map(v => v.trim()).filter(v => v);
          } else {
            updates[key] = input.value;
          }
        }
      });

      const tagsPillsContainer = container.querySelector('.tags-pills-container[data-property-key="tags"]');
      if (tagsPillsContainer) {
        const pills = tagsPillsContainer.querySelectorAll('.tag-pill .tag-text');
        const tags: string[] = [];
        pills.forEach((pill: HTMLElement) => {
          tags.push(pill.textContent || '');
        });
        updates['tags'] = tags;
      }

      const content = await this.app.vault.read(this.currentFile);
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (frontmatterMatch) {
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
        const newContent = content.replace(/^---\n[\s\S]*?\n---/, `---\n${newFrontmatter}\n---`);

        await this.app.vault.modify(this.currentFile, newContent);
        new Notice('Properties updated');
      }
    } catch (error) {
      console.error('Failed to save properties:', error);
      new Notice('Failed to save properties');
    }
  }

  async commitAndPush(message: string) {
    console.log((this.app.vault.adapter as any).basePath)
    try {
      await execAsync(`git add -A`, { cwd: (this.app.vault.adapter as any).basePath });
      await execAsync(`git commit -m "${message}"`, { cwd: (this.app.vault.adapter as any).basePath });
      await execAsync(`git push`,  { cwd: (this.app.vault.adapter as any).basePath });
    } catch (error) {
      console.error('Failed to commit and push:', error);
      new Notice(`Failed to unpublish post: ${(error as any).message}`);
    }
  }

  async deletePost() {
    if (!this.currentFile) return;

    const confirmation = confirm(`Are you sure you want to delete "${this.currentFile.name}"?`);
    if (!confirmation) return;

    try {

      await this.app.vault.delete(this.currentFile);

      const commitMsg = `Delete: ${this.currentFile.basename}`;
      this.commitAndPush(commitMsg)

      new Notice(`Deleted: ${this.currentFile.basename}`);
      this.currentFile = null;
      this.render();
      this.refreshBlogList();
    } catch (error) {
      console.error('Failed to delete post:', error);
      new Notice('Failed to delete post');
    }
  }

  async unpublishPost() {
    if (!this.currentFile) return;

    try {
      const filename = this.currentFile.name;
      const title = this.currentFile.basename;

      const newFilename = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '');
      const newRelativePath = `_drafts/${newFilename}`;

      await this.app.vault.rename(this.currentFile, newRelativePath);

      const renamedFile = this.app.vault.getAbstractFileByPath(newRelativePath);

      const commitMsg = `Unpublish: ${title}`;
      await this.commitAndPush(commitMsg)

      new Notice(`Unpublished: ${title}`);

      if (renamedFile instanceof TFile) {
        this.currentFile = renamedFile;
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(renamedFile);
      }

      setTimeout(() => {
        this.updateProperties();
        this.refreshBlogList();
      }, 100);
    } catch (error) {
      console.error('Failed to unpublish post:', error);
      new Notice(`Failed to unpublish post: ${error.message}`);
    }
  }

  async publishPostFromProperties() {
    if (!this.currentFile) return;

    try {
      const filename = this.currentFile.name;
      const title = this.currentFile.basename;

      const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})-/);
      let newFilename = filename;

      if (!dateMatch) {
        const today = new Date().toISOString().split('T')[0];
        newFilename = `${today}-${filename}`;
      }

      const newRelativePath = `_posts/${newFilename}`;

      await this.app.vault.rename(this.currentFile, newRelativePath);

      const renamedFile = this.app.vault.getAbstractFileByPath(newRelativePath);

      const commitMsg = `Publish: ${title}`;
      await this.commitAndPush(commitMsg)

      new Notice(`Published: ${title}`);

      if (renamedFile instanceof TFile) {
        this.currentFile = renamedFile;
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(renamedFile);
      }

      setTimeout(() => {
        this.updateProperties();
        this.refreshBlogList();
      }, 100);
    } catch (error) {
      console.error('Failed to publish post:', error);
      new Notice(`Failed to publish post: ${error.message}`);
    }
  }

  refreshBlogList() {
    const leaves = this.app.workspace.getLeavesOfType('jekyll-blog-view');
    if (leaves.length > 0) {
      const blogView = leaves[0].view as JekyllBlogView;
      blogView.refresh();
    }
  }

  addPropertiesStyles() {
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
  }
}

class JekyllBlogSettingTab extends PluginSettingTab {
  plugin: JekyllBlogManagerPlugin;

  constructor(app: App, plugin: JekyllBlogManagerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', {
      text: 'Jekyll Blog Manager'
    });

    containerEl.createEl('p', {
      text: 'Posts are managed directly from the current vault using the _drafts and _posts folders.'
    });
  }
}

class TitleInputModal extends Modal {
  result: string;
  onSubmit: (result: string | null) => void;

  constructor(app: App, onSubmit: (result: string | null) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: 'New Blog Post' });

    const inputContainer = contentEl.createDiv();
    inputContainer.createEl('label', { text: 'Post Title' });

    const input = inputContainer.createEl('input', {
      type: 'text',
      placeholder: 'Enter post title...'
    });
    input.style.width = '100%';
    input.style.marginTop = '10px';
    input.style.padding = '8px';

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submit(input.value);
      }
    });

    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.marginTop = '20px';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => {
      this.onSubmit('');
      this.close();
    });

    const submitBtn = buttonContainer.createEl('button', {
      text: 'Create',
      cls: 'mod-cta'
    });
    submitBtn.addEventListener('click', () => {
      this.submit(input.value);
    });

    input.focus();
  }

  submit(value: string) {
    if (value && value.trim()) {
      this.result = value.trim();
      this.close();
      this.onSubmit(this.result);
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
