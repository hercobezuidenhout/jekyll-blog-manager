# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian plugin for managing Jekyll blog posts with a distraction-free writing interface. Features dual-panel workspace: post list (left) and properties editor (right).

## Claude Code Dos and Donts

- Don't add co-author to commit messages - it clutters the Github

## Build Commands

```bash
# Development (watch mode with sourcemaps)
npm run dev

# Production build (includes TypeScript type checking)
npm run build

# Type checking only
npx tsc -noEmit -skipLibCheck
```

## Architecture

### Code Organization

```
src/
├── main.ts                      # Plugin entry point (minimal)
├── types.ts                     # Shared interfaces and constants
├── views/                       # Obsidian ItemView implementations
│   ├── BlogListView.ts         # Left panel post list
│   └── PropertiesView.ts       # Right panel properties editor
├── services/                    # Curried functional services
│   ├── post.ts                 # Post CRUD operations
│   ├── git.ts                  # Git commit/push operations
│   ├── tags.ts                 # Tag/category aggregation
│   └── frontmatter.ts          # YAML parsing (pure functions)
├── ui/                          # UI utilities
│   ├── render.ts               # DOM rendering functions
│   ├── styles.ts               # Style injection
│   └── workspace.ts            # Workspace configuration
├── utils/                       # Pure utility functions
│   ├── date.ts                 # Date formatting
│   └── text.ts                 # Text utilities
├── modals/
│   └── TitleInputModal.ts      # New post modal
└── settings/
    └── SettingTab.ts           # Settings tab
```

### Service Pattern (Curried Functions)

Services use factory functions that capture dependencies in closure:

```typescript
const postService = createPostService(app);
await postService.loadPosts();
await postService.publishPost(file);
```

This avoids passing the same parameters repeatedly and prepares for future Svelte integration.

### View Structure

Views are thin wrappers that:
1. Instantiate curried services in constructor
2. Call service functions for business logic
3. Use renderer functions for DOM manipulation
4. Inject styles on render

### File Organization

Plugin operates on Jekyll convention:
- `_drafts/` - Draft posts (no date prefix in filename)
- `_posts/` - Published posts (must have `YYYY-MM-DD-` prefix)

### Git Integration

`createGitService(basePath)` returns curried functions:
- `commitAndPush(message)` - Stages, commits, and pushes
- Uses vault base path: `(this.app.vault.adapter as any).basePath`

### Frontmatter Parsing

Pure functions in `services/frontmatter.ts`:
- `parseFrontmatter(content)` - Extract properties from YAML
- `updateProperty(content, key, value)` - Update single property
- `updateMultipleProperties(content, updates)` - Batch update
- Manual regex parsing: `^---\n([\s\S]*?)\n---`

### UI Rendering

`createRenderer()` returns functional rendering utilities:
- `renderBlogList()` - Renders post list with callbacks
- `renderPostItem()` - Individual post card
- `renderTagsPills()` - Interactive tag editor
- `renderCategoriesDropdown()` - Category selector

### UI Customization

`configureMinimalWorkspace()` hides Obsidian UI via injected CSS:
- Left ribbon, status bar, view actions, tab headers, frontmatter containers
- Creates `<style id="jekyll-minimal-workspace">`

## Key Patterns

### Service Composition

Views compose multiple services:
```typescript
this.postService = createPostService(this.app);
this.gitService = createGitService(basePath);
this.tagService = createTagService(this.app.metadataCache);
```

### Functional Approach

Minimal classes (only where Obsidian API requires):
- Plugin class, View classes, Modal classes, SettingTab class
- Everything else: pure functions or curried factory functions
- No comments in code

### View Refresh Strategy

Plugin listens to vault events and refreshes both views:
- `create`, `modify`, `rename`, `delete` events
- Calls `refresh()` on blog view and `updateProperties()` on properties view

### Future Svelte Integration

Services are UI-agnostic and return plain data, making them compatible with Svelte stores. Views can be migrated to mount Svelte components without changing service layer.

## Obsidian API Usage

- `this.app.vault` - File operations (read, modify, rename, delete, create)
- `this.app.workspace` - Leaf management and view activation
- `this.app.metadataCache` - Read frontmatter (used for reading only)
- `this.registerView()` - Register custom view types
- `this.registerEvent()` - Subscribe to vault/workspace events

## Development Notes

- Plugin is desktop-only (`isDesktopOnly: true`)
- Minimum Obsidian version: 0.15.0
- Uses esbuild for bundling with CommonJS output
- All Obsidian modules marked as external in build config
- TypeScript target: ES6, module format: ESNext
