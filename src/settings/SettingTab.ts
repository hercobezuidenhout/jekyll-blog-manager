import { App, PluginSettingTab } from 'obsidian';
import type JekyllBlogManagerPlugin from '../main';

export class JekyllBlogSettingTab extends PluginSettingTab {
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
