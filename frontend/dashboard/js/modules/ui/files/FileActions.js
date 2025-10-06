// js/modules/ui/files/FileActions.js - ФАЙЛ КОРРЕКТЕН!

import { FileDelete } from './FileDelete.js';

export class FileActions {
    /**
     * Устанавливает обработчики событий для кнопок просмотра и удаления.
     */
    static setupFileActions(fileElement, clientData, callbacks = {}) {
        const viewBtn = fileElement.querySelector('.view-btn');
        const deleteBtn = fileElement.querySelector('.delete-btn');

        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();

                const fileType = fileElement.dataset.fileType;

                if (fileType === 'text' && clientData.textFile) {
                    callbacks.onViewText?.(clientData.textFile);
                } else if (fileType === 'images' && clientData.imageFiles) {
                    callbacks.onViewImages?.(clientData.imageFiles);
                }
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileType = fileElement.dataset.fileType;

                // 🚨 Проверка, является ли элемент последним
                const isLast = FileDelete.isLastItemInBlock(fileElement);

                if (fileType === 'text' && clientData.textFile) {
                    // Передаем isLast в onDeleteText
                    callbacks.onDeleteText?.(clientData.textFile, fileElement, isLast);
                } else if (fileType === 'images' && clientData.imageFiles) {
                    // Передаем isLast в onDeleteImages
                    callbacks.onDeleteImages?.(clientData.imageFiles, fileElement, isLast);
                }
            });
        }
    }

    static setupBlockActions(block, clientData, callbacks = {}) {
        const deleteBtn = block.querySelector('.delete-block-btn');
        if (deleteBtn) {
             deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                callbacks.onDeleteBlock?.(block, clientData);
            });
        }
    }
}