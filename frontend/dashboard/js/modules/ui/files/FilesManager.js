import { FileService } from './FileService.js';
import { FileRenderer } from './FileRenderer.js';
import { FileModal } from './FileModal.js';
import { applySearchFilter } from '../search.js';

export class FilesManager {
    constructor(containerId, modalId) {
        this.container = document.getElementById(containerId);
        this.modal = new FileModal(modalId);
        this.groupedFiles = {};
        this.setupGlobalListeners();
    }

    updateData(filesData) {
        this.groupedFiles = FileService.groupByClient(filesData);
        this.render();
    }

    render(data = this.groupedFiles) {
        FileRenderer.renderGrid(this.container, data);
    }

    setupGlobalListeners() {
        this.container.addEventListener('click', (e) => {
            const fileItem = e.target.closest('.file-item');
            const block = e.target.closest('.client-file-block');
            if (!block) return;

            const clientKey = `${block.dataset.clientId}_${block.dataset.ip}`;
            const clientData = this.groupedFiles[clientKey];

            // Кнопка удаления всего блока
            if (e.target.classList.contains('delete-block-btn')) {
                if (confirm(`Удалить все файлы клиента ${block.dataset.clientId}?`)) {
                    block.remove();
                    delete this.groupedFiles[clientKey];
                }
                return;
            }

            if (!fileItem) return;
            const type = fileItem.dataset.fileType;
            const data = type === 'text' ? clientData.textFile : clientData.imageFiles;

            // Кнопка просмотра
            if (e.target.classList.contains('view-btn')) {
                this.modal.show(type, data);
            }
            // Кнопка удаления одного типа файлов
            else if (e.target.classList.contains('delete-btn')) {
                if (confirm('Удалить этот элемент?')) {
                    fileItem.remove();
                    if (block.querySelectorAll('.file-item').length === 0) block.remove();
                }
            }
        });
    }

    filterBySearch(query) {
        const filtered = applySearchFilter(Object.values(this.groupedFiles), query);
        const result = filtered.reduce((acc, c) => ({ ...acc, [`${c.clientId}_${c.ip}`]: c }), {});
        this.render(result);
    }
}