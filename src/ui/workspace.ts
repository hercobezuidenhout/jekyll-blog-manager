export const configureMinimalWorkspace = (): void => {
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
};

export const cleanupWorkspace = (): void => {
  const style = document.getElementById('jekyll-minimal-workspace');
  if (style) {
    style.remove();
  }
};
