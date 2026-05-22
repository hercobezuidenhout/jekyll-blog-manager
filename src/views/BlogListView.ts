import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import type JekyllBlogManagerPlugin from '../main';
import { createPostService } from '../services/post';
import { createRenderer } from '../ui/render';
import { injectBlogListStyles } from '../ui/styles';
import { TitleInputModal } from '../modals/TitleInputModal';
import type { BlogPost } from '../types';
import { VIEW_TYPE_BLOG } from '../types';

export class BlogListView extends ItemView {
  plugin: JekyllBlogManagerPlugin;
  posts: BlogPost[] = [];
  private postService: ReturnType<typeof createPostService>;
  private renderer: ReturnType<typeof createRenderer>;

  constructor(leaf: WorkspaceLeaf, plugin: JekyllBlogManagerPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.postService = createPostService(this.app);
    this.renderer = createRenderer();
  }

  getViewType() {
    return VIEW_TYPE_BLOG;
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
    this.posts = await this.postService.loadPosts();
  }

  render() {
    const container = this.containerEl.children[1];

    this.renderer.renderBlogList(container as HTMLElement, this.posts, {
      onPostClick: (file) => this.openPostInEditor(file),
      onNewPost: () => this.createNewPost()
    });

    injectBlogListStyles();
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

      const file = await this.postService.createPost(title);
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
}
