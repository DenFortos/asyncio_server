import { FileGrouping } from './FileGrouping.js';
import { FileRenderer } from './FileRenderer.js';
import { FileActions } from './FileActions.js';
import { FileModal } from './FileModal.js';
import { FileDownload } from './FileDownload.js';
import { FileDelete } from './FileDelete.js';

export class FilesManager {
    constructor(containerId, modalId) {
        this.container = document.getElementById(containerId);
        this.modal = new FileModal(modalId);
        this.filesData = [];
        this.groupedFiles = {};
    }

    updateData(filesData) {
        this.filesData = filesData;
        this.groupedFiles = FileGrouping.groupByClient(filesData);
        this.render();
        return this;
    }

    render() {
        FileRenderer.renderGrid(this.container, this.groupedFiles);

        // Установка обработчиков
        this.container.querySelectorAll('.client-file-block').forEach(block => {
            const clientId = block.dataset.clientId;
            const ip = block.dataset.ip;
            const clientData = this.groupedFiles[`${clientId}_${ip}`];

            // Обработка текстового файла
            const textFileElement = block.querySelector('[data-file-type="text"]');
            if (textFileElement && clientData.textFile) {
                FileActions.setupFileActions(textFileElement, clientData, {
                    onViewText: (file) => this.modal.showText(file),
                    onDownloadText: (file) => FileDownload.downloadText(file),
                    onDeleteText: (file, element) => {
                        FileDelete.showConfirmation(
                            `Вы действительно хотите удалить файл ${file.name}?`,
                            () => element.remove()
                        );
                    }
                });
            }

            // Обработка изображений
            const imageFileElement = block.querySelector('[data-file-type="images"]');
            if (imageFileElement && clientData.imageFiles.length > 0) {
                FileActions.setupFileActions(imageFileElement, clientData, {
                    onViewImages: (images) => this.modal.showImages(images),
                    onDownloadImages: (images) => FileDownload.downloadImages(images),
                    onDeleteImages: (images, element) => {
                        FileDelete.showConfirmation(
                            `Вы действительно хотите удалить все фото?`,
                            () => element.remove()
                        );
                    }
                });
            }

            // Удаление всего блока
            FileActions.setupBlockActions(block, clientData, {
                onDeleteBlock: (block, clientData) => {
                    FileDelete.showBlockConfirmation(clientData, () => {
                        block.remove();
                        delete this.groupedFiles[`${clientData.clientId}_${clientData.ip}`];
                        this.filesData = this.filesData.filter(data =>
                            !(data.clientId === clientData.clientId && data.ip === clientData.ip)
                        );
                    });
                }
            });
        });
    }
}