export class FileActions {
    static setupFileActions(fileElement, fileData, callbacks = {}) {
        const viewBtn = fileElement.querySelector('.view-btn');
        const deleteBtn = fileElement.querySelector('.delete-btn');

        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                const fileType = fileElement.dataset.fileType;
                if (fileType === 'text' && fileData.textFile) {
                    callbacks.onViewText?.(fileData.textFile);
                } else if (fileType === 'images' && fileData.imageFiles) {
                    callbacks.onViewImages?.(fileData.imageFiles);
                }
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                const fileType = fileElement.dataset.fileType;
                if (fileType === 'text' && fileData.textFile) {
                    callbacks.onDeleteText?.(fileData.textFile, fileElement);
                } else if (fileType === 'images' && fileData.imageFiles) {
                    callbacks.onDeleteImages?.(fileData.imageFiles, fileElement);
                }
            });
        }
    }

    static setupBlockActions(block, clientData, callbacks = {}) {
        const deleteBtn = block.querySelector('.delete-block-btn');
        deleteBtn.addEventListener('click', () => callbacks.onDeleteBlock?.(block, clientData));
    }
}