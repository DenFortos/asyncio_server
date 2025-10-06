// js/modules/ui/files/FilesManager.js

import { FileGrouping } from './FileGrouping.js';
import { FileRenderer } from './FileRenderer.js';
import { FileActions } from './FileActions.js';
import { FileModal } from './FileModal.js';
import { FileDownload } from './FileDownload.js'; // Используется в FileModal
import { FileDelete } from './FileDelete.js';
// 🚨 ИСПРАВЛЕННЫЙ ПУТЬ: (если search.js находится в js/modules/ui/search.js)
import { applySearchFilter } from '../search.js';

export class FilesManager {
    constructor(containerId, modalId) {
        this.container = document.getElementById(containerId);
        // Модальное окно инициализируется с передачей ID HTML-элемента
        this.modal = new FileModal(modalId);
        this.filesData = [];
        this.groupedFiles = {};
    }

    updateData(filesData) {
        if (!this.container) return;
        this.filesData = filesData;
        this.groupedFiles = FileGrouping.groupByClient(filesData);
        this.render();
        return this;
    }

    render(filesToRender = null) {
        const data = filesToRender || this.groupedFiles;

        FileRenderer.renderGrid(this.container, data);
        this.setupActions(data);
    }

    filterBySearch(query) {
        let clientsArray = Object.values(this.groupedFiles);

        const filteredClients = applySearchFilter(clientsArray, query);

        const filteredGrouped = filteredClients.reduce((acc, client) => {
             const key = `${client.clientId}_${client.ip}`;
             acc[key] = client;
             return acc;
        }, {});

        this.render(filteredGrouped);
    }

    setupActions(groupedFiles) {
        this.container.querySelectorAll('.client-file-block').forEach(block => {
            const clientId = block.dataset.clientId;
            const ip = block.dataset.ip;
            const clientKey = `${clientId}_${ip}`;
            const clientData = groupedFiles[clientKey];

            if (!clientData) return;

            // 1. Обработка текстового файла (JSON/Text)
            const textFileElement = block.querySelector('[data-file-type="text"]');
            if (textFileElement && clientData.textFile) {
                FileActions.setupFileActions(textFileElement, clientData, {
                    onViewText: (file) => this.modal.showText(file),

                    // 🚨 ИЗМЕНЕНИЕ: Принимаем isLast и используем его
                    onDeleteText: (file, element, isLast) => {
                        FileDelete.showConfirmation(
                            `Вы действительно хотите удалить файл ${file.name}?`,
                            () => {
                                element.remove(); // Удаляем элемент файла
                                if (isLast) {
                                    block.remove(); // ⬅️ УДАЛЯЕМ ВЕСЬ БЛОК
                                }
                                // Опционально: Обновление состояния в this.groupedFiles
                            }
                        );
                    }
                });
            }

            // 2. Обработка изображений
            const imageFileElement = block.querySelector('[data-file-type="images"]');
            if (imageFileElement && clientData.imageFiles.length > 0) {
                FileActions.setupFileActions(imageFileElement, clientData, {
                    onViewImages: (images) => this.modal.showImages(images),

                    // 🚨 ИЗМЕНЕНИЕ: Принимаем isLast и используем его
                    onDeleteImages: (images, element, isLast) => {
                        FileDelete.showConfirmation(
                            `Вы действительно хотите удалить все фото? (${images.length} шт.)`,
                            () => {
                                element.remove(); // Удаляем элемент фото
                                if (isLast) {
                                    block.remove(); // ⬅️ УДАЛЯЕМ ВЕСЬ БЛОК
                                }
                                // Опционально: Обновление состояния в this.groupedFiles
                            }
                        );
                    }
                });
            }

            // 3. Удаление всего блока
            FileActions.setupBlockActions(block, clientData, {
                onDeleteBlock: (block, clientData) => {
                    FileDelete.showBlockConfirmation(clientData, () => {
                        block.remove();
                        delete this.groupedFiles[clientKey];
                    });
                }
            });
        });
    }
}