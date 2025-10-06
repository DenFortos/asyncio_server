// js/modules/ui/files/FileModal.js

import { FileDownload } from './FileDownload.js';

export class FileModal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        if (!this.modal) {
            console.error(`FileModal: Element with ID "${modalId}" not found. Modal functions disabled.`);
            this.isDisabled = true;
            return;
        }
        this.isDisabled = false;
        this.title = this.modal.querySelector('#fileModalTitle');
        this.body = this.modal.querySelector('#fileModalBody');
        this.downloadBtn = this.modal.querySelector('#downloadFileModal');
        this.setupEventListeners();
    }

    showText(textFile) {
        if (this.isDisabled) return;
        console.log('FileModal: Attempting to show text.');
        this.title.textContent = `Текстовый файл: ${textFile.name}`;
        this.body.innerHTML = `
            <pre class="file-content-text">${textFile.content || '[Содержимое файла недоступно]'}</pre>
        `;
        this.downloadBtn.style.display = 'block';
        this.downloadBtn.textContent = 'Скачать'; // Убедимся, что текст кнопки установлен
        this.downloadBtn.onclick = () => FileDownload.downloadText(textFile); // ⬅️ Используем импортированный класс
        this.modal.style.display = 'block';
    }

    showImages(imageFiles) {
        if (this.isDisabled) return;
        console.log('FileModal: Attempting to show images.');
        this.title.textContent = `Фото (${imageFiles.length} шт.)`;
        this.body.innerHTML = `
            <div class="images-gallery">
                ${imageFiles.map((img, index) => `
                    <div class="image-item">
                        <img src="${img.url}" alt="Фото ${index + 1}" class="gallery-image">
                        <button class="download-single-btn" data-url="${img.url}" data-name="${img.name}">
                            Скачать
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        this.downloadBtn.style.display = 'block';
        this.downloadBtn.textContent = 'Скачать все фото';
        this.downloadBtn.onclick = () => FileDownload.downloadImages(imageFiles); // ⬅️ Используем импортированный класс
        this.modal.style.display = 'block';

        this.body.querySelectorAll('.download-single-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.target.dataset.url;
                const name = e.target.dataset.name;
                FileDownload.downloadFile(url, name); // ⬅️ Используем импортированный класс
            });
        });
    }

    hide() {
        if (this.isDisabled) return;
        this.modal.style.display = 'none';
    }

    setupEventListeners() {
        if (this.isDisabled) return;

        // Используем querySelector, так как элементы внутри модального окна
        const closeBtn = this.modal.querySelector('#closeFileModal');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        window.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
    }

    // Удаляем дублирующие методы download, так как используем FileDownload.js
}