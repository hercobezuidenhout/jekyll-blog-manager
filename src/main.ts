import { Plugin, WorkspaceLeaf } from 'obsidian';
import { BlogListView } from './views/BlogListView';
import { PropertiesView } from './views/PropertiesView';
import { JekyllBlogSettingTab } from './settings/SettingTab';
import { configureMinimalWorkspace, cleanupWorkspace } from './ui/workspace';
import { VIEW_TYPE_BLOG, VIEW_TYPE_PROPERTIES } from './types';

export default class JekyllBlogManagerPlugin extends Plugin {
  async onload() {
    this.registerView(
      VIEW_TYPE_BLOG,
      (leaf) => new BlogListView(leaf, this)
    );

    this.registerView(
      VIEW_TYPE_PROPERTIES,
      (leaf) => new PropertiesView(leaf, this)
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
      configureMinimalWorkspace();
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
    const blogLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_BLOG);
    for (const leaf of blogLeaves) {
      const view = leaf.view as BlogListView;
      await view.refresh();
    }
    const propertyLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PROPERTIES);
    for (const leaf of propertyLeaves) {
      const view = leaf.view as PropertiesView;
      await view.updateProperties();
    }
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_BLOG);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_PROPERTIES);
    cleanupWorkspace();
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_BLOG);

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getLeftLeaf(false);
      if (leaf) {
        await leaf.setViewState({ type: VIEW_TYPE_BLOG, active: true });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  async activatePropertiesView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_PROPERTIES);

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({ type: VIEW_TYPE_PROPERTIES, active: true });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
}
