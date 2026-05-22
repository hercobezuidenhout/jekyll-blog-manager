import { App, Modal } from 'obsidian';

export class TitleInputModal extends Modal {
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
