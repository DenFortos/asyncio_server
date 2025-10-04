// js/modules/ui/files/FileModal.js
export class FileModal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        this.title = document.getElementById('fileModalTitle');
        this.body = document.getElementById('fileModalBody');
        this.downloadBtn = document.getElementById('downloadFileModal');
        this.setupEventListeners();
    }

    showText(textFile) {
        this.title.textContent = `Текстовый файл: ${textFile.name}`;
        this.body.innerHTML = `
            <pre class="file-content-text">${textFile.content || '[Содержимое файла]'}</pre>
        `;
        this.downloadBtn.style.display = 'block'; // Показываем кнопку скачивания для текста
        this.downloadBtn.onclick = () => this.downloadText(textFile);
        this.modal.style.display = 'block';
    }

    showImages(imageFiles) {
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
        this.downloadBtn.style.display = 'block'; // Показываем кнопку "Скачать всё"
        this.downloadBtn.textContent = 'Скачать всё';
        this.downloadBtn.onclick = () => this.downloadAllImages(imageFiles);
        this.modal.style.display = 'block';

        // Добавляем обработчики для кнопок скачивания каждого фото
        this.body.querySelectorAll('.download-single-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.target.dataset.url;
                const name = e.target.dataset.name;
                this.downloadImage(url, name);
            });
        });
    }

    downloadText(textFile) {
        const blob = new Blob([textFile.content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = textFile.name;
        a.click();
        URL.revokeObjectURL(url);
    }

    downloadImage(url, name) {
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
    }

    downloadAllImages(imageFiles) {
        imageFiles.forEach(img => {
            this.downloadImage(img.url, img.name);
        });
    }

    hide() {
        this.modal.style.display = 'none';
    }

    setupEventListeners() {
        const closeBtn = document.getElementById('closeFileModal');
        closeBtn.addEventListener('click', () => this.hide());

        window.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
    }
}