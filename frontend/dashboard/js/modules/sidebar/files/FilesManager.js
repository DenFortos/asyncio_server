// js/modules/sidebar/files/FilesManager.js

import { FileCore } from './FileCore.js';
import { FileModal } from './FileModal.js';
// Исправлено: выходим из files, выходим из sidebar, заходим в ui
import { applySearchFilter } from '../../ui/search.js';

export class FilesManager {
    constructor(containerId, modalId) {
        this.container = document.getElementById(containerId);
        this.modal = new FileModal(modalId);
        this.groupedFiles = {};
        this.setupEventListeners();
    }

    updateData(data) {
        if (!data) return;
        this.groupedFiles = FileCore.groupByClient(data);
        this.render();
    }

    render(data = this.groupedFiles) {
        if (!this.container) return;
        FileCore.renderGrid(this.container, data);
    }

    setupEventListeners() {
        if (!this.container) return;
        this.container.addEventListener('click', (e) => {
            const btn = e.target;
            const block = btn.closest('.client-file-block');
            const fileItem = btn.closest('.file-item');

            if (!block) return;
            const clientKey = `${block.dataset.clientId}_${block.dataset.ip}`;
            const clientData = this.groupedFiles[clientKey];

            if (btn.classList.contains('delete-block-btn')) {
                if (confirm(`Удалить клиента ${block.dataset.clientId}?`)) {
                    delete this.groupedFiles[clientKey];
                    block.remove();
                }
                return;
            }

            if (!fileItem) return;
            const type = fileItem.dataset.fileType;

            if (btn.classList.contains('view-btn')) {
                const content = type === 'text' ? clientData.textFile : clientData.imageFiles;
                this.modal.show(type, content);
            }

            else if (btn.classList.contains('delete-btn')) {
                if (confirm('Удалить эти файлы?')) {
                    fileItem.remove();
                    if (block.querySelector('.client-block-files').children.length === 0) {
                        block.remove();
                        delete this.groupedFiles[clientKey];
                    }
                }
            }
        });
    }

    filterBySearch(query) {
        const filteredList = applySearchFilter(Object.values(this.groupedFiles), query);
        const filteredGroup = filteredList.reduce((acc, c) => {
            acc[`${c.clientId}_${c.ip}`] = c;
            return acc;
        }, {});
        this.render(filteredGroup);
    }
}