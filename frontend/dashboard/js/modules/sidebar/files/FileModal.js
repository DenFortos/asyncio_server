// js/modules/sidebar/files/FileModal.js

import { FileService } from './FileService.js';

export class FileModal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        if (!this.modal) {
            console.warn(`Modal with id ${modalId} not found`);
            return;
        }

        this.title = this.modal.querySelector('#fileModalTitle');
        this.body = this.modal.querySelector('#fileModalBody');
        this.downloadBtn = this.modal.querySelector('#downloadFileModal');

        this.modal.querySelector('#closeFileModal')?.addEventListener('click', () => this.hide());
        window.addEventListener('click', (e) => e.target === this.modal && this.hide());
    }

    show(type, data) {
        if (!this.modal) return;
        if (type === 'text') {
            this.title.textContent = `Текстовый файл: ${data.name}`;
            this.body.innerHTML = `<pre class="file-content-text">${data.content || 'Пусто'}</pre>`;
            this.downloadBtn.onclick = () => FileService.downloadText(data);
        } else {
            this.title.textContent = `Фото (${data.length} шт.)`;
            this.body.innerHTML = `<div class="images-gallery">${data.map(img => `
                <div class="image-item">
                    <img src="${img.url}" class="gallery-image">
                    <button class="dl-single" data-url="${img.url}" data-name="${img.name}">Скачать</button>
                </div>`).join('')}</div>`;
            this.downloadBtn.onclick = () => data.forEach(img => FileService.download(img.url, img.name));

            this.body.querySelectorAll('.dl-single').forEach(btn => {
                btn.onclick = (e) => FileService.download(e.target.dataset.url, e.target.dataset.name);
            });
        }
        this.modal.style.display = 'block';
    }

    hide() { if (this.modal) this.modal.style.display = 'none'; }
}