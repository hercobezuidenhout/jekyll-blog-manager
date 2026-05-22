import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import type JekyllBlogManagerPlugin from '../main';
import { createPostService } from '../services/post';
import { createGitService } from '../services/git';
import { createTagService } from '../services/tags';
import { createRenderer } from '../ui/render';
import { parseFrontmatter, updateMultipleProperties } from '../services/frontmatter';
import { injectPropertiesStyles } from '../ui/styles';
import { formatDate } from '../utils/date';
import { VIEW_TYPE_PROPERTIES } from '../types';

export class PropertiesView extends ItemView {
  plugin: JekyllBlogManagerPlugin;
  currentFile: TFile | null = null;
  properties: Record<string, any> = {};
  allTags: Set<string> = new Set();
  allCategories: Set<string> = new Set();

  private postService: ReturnType<typeof createPostService>;
  private gitService: ReturnType<typeof createGitService>;
  private tagService: ReturnType<typeof createTagService>;
  private renderer: ReturnType<typeof createRenderer>;

  constructor(leaf: WorkspaceLeaf, plugin: JekyllBlogManagerPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.postService = createPostService(this.app);
    this.gitService = createGitService((this.app.vault.adapter as any).basePath);
    this.tagService = createTagService(this.app.metadataCache);
    this.renderer = createRenderer();
  }

  getViewType() {
    return VIEW_TYPE_PROPERTIES;
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
      this.properties = parseFrontmatter(content);

      const blogFiles = this.app.vault.getMarkdownFiles().filter(file =>
        file.path.startsWith('_drafts/') || file.path.startsWith('_posts/')
      );

      const { tags, categories } = await this.tagService.getAllTagsAndCategories(blogFiles);
      this.allTags = tags;
      this.allCategories = categories;
    } catch (error) {
      console.error('Failed to load properties:', error);
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
      const newContent = updateMultipleProperties(content, updates);
      await this.app.vault.modify(this.currentFile, newContent);
      new Notice('Properties updated');
    } catch (error) {
      console.error('Failed to save properties:', error);
      new Notice('Failed to save properties');
    }
  }

  async publishPost() {
    if (!this.currentFile) return;

    try {
      const title = this.currentFile.basename;
      const renamedFile = await this.postService.publishPost(this.currentFile);
      await this.gitService.commitAndPush(`Publish: ${title}`);

      new Notice(`Published: ${title}`);

      this.currentFile = renamedFile;
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(renamedFile);

      setTimeout(() => {
        this.updateProperties();
        this.refreshBlogList();
      }, 100);
    } catch (error) {
      console.error('Failed to publish post:', error);
      new Notice(`Failed to publish post: ${error.message}`);
    }
  }

  async unpublishPost() {
    if (!this.currentFile) return;

    try {
      const title = this.currentFile.basename;
      const renamedFile = await this.postService.unpublishPost(this.currentFile);
      await this.gitService.commitAndPush(`Unpublish: ${title}`);

      new Notice(`Unpublished: ${title}`);

      this.currentFile = renamedFile;
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(renamedFile);

      setTimeout(() => {
        this.updateProperties();
        this.refreshBlogList();
      }, 100);
    } catch (error) {
      console.error('Failed to unpublish post:', error);
      new Notice(`Failed to unpublish post: ${error.message}`);
    }
  }

  async deletePost() {
    if (!this.currentFile) return;

    const confirmation = confirm(`Are you sure you want to delete "${this.currentFile.name}"?`);
    if (!confirmation) return;

    try {
      const basename = this.currentFile.basename;
      await this.postService.deletePost(this.currentFile);
      await this.gitService.commitAndPush(`Delete: ${basename}`);

      new Notice(`Deleted: ${basename}`);
      this.currentFile = null;
      this.render();
      this.refreshBlogList();
    } catch (error) {
      console.error('Failed to delete post:', error);
      new Notice('Failed to delete post');
    }
  }

  refreshBlogList() {
    const leaves = this.app.workspace.getLeavesOfType('jekyll-blog-view');
    if (leaves.length > 0) {
      const blogView = leaves[0].view as any;
      if (blogView.refresh) {
        blogView.refresh();
      }
    }
  }

  render() {
    const container = this.containerEl.children[1] as HTMLElement;
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
      const dateText = formatDate(this.properties['date']);
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
        this.renderer.renderProperty(postInfoSection, key, this.properties[key]);
      }
    }

    const orgSection = container.createDiv({ cls: 'property-section' });
    orgSection.createEl('div', { text: 'Organization', cls: 'section-title' });

    if (this.properties['tags'] !== undefined) {
      const propRow = orgSection.createDiv({ cls: 'property-row' });
      propRow.createEl('label', { text: '🏷️ Tags', cls: 'property-label' });
      this.renderer.renderTagsPills(propRow, this.properties['tags'], this.allTags);
    }

    if (this.properties['categories'] !== undefined) {
      const propRow = orgSection.createDiv({ cls: 'property-row' });
      propRow.createEl('label', { text: '📁 Categories', cls: 'property-label' });
      this.renderer.renderCategoriesDropdown(propRow, this.properties['categories'], this.allCategories);
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
        await this.publishPost();
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

    injectPropertiesStyles();
  }
}
