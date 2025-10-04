import { FileTypes } from './FileTypes.js';

export class FileRenderer {
    static renderGrid(container, groupedFiles) {
        container.innerHTML = '';

        Object.entries(groupedFiles).forEach(([key, clientData]) => {
            const block = this.createClientBlock(clientData);
            container.appendChild(block);
        });
    }

    static createClientBlock(clientData) {
        const block = document.createElement('div');
        block.className = 'client-file-block';
        block.dataset.clientId = clientData.clientId;
        block.dataset.ip = clientData.ip;

        const imageCount = clientData.imageFiles.length;

        block.innerHTML = `
            <div class="client-block-header">
                <div class="client-block-title">
                    ${clientData.clientId} | ${clientData.ip} | ${clientData.pcName}
                </div>
            </div>
            <div class="client-block-files">
                ${clientData.textFile ? this.createTextFileItem(clientData.textFile) : ''}
                ${imageCount > 0 ? this.createImageFileItem(imageCount) : ''}
            </div>
            <button class="delete-block-btn" data-client-id="${clientData.clientId}">
                🗑 Удалить весь блок
            </button>
        `;

        return block;
    }

    static createTextFileItem(textFile) {
        const icon = FileTypes.getFileIcon('text');
        return `
            <div class="file-item" data-file-type="text" data-file-id="${textFile.id}">
                <div class="file-icon">${icon}</div>
                <div class="file-info">
                    <div class="file-name">${textFile.name}</div>
                    <div class="file-meta">
                        <span>${textFile.date}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-action-btn view-btn" title="Просмотр">👁</button>
                    <button class="file-action-btn delete-btn" title="Удалить">🗑</button>
                </div>
            </div>
        `;
    }

    static createImageFileItem(count) {
        const icon = FileTypes.getFileIcon('image');
        return `
            <div class="file-item" data-file-type="images">
                <div class="file-icon">${icon}</div>
                <div class="file-info">
                    <div class="file-name">Фото: ${count} шт.</div>
                    <div class="file-meta">
                        <span>Все фото</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-action-btn view-btn" title="Просмотр">👁</button>
                    <button class="file-action-btn delete-btn" title="Удалить">🗑</button>
                </div>
            </div>
        `;
    }
}