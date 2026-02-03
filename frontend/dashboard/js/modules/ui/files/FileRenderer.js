// js/modules/ui/files/FileRenderer.js

import { FileIcons } from './FileService.js';

export class FileRenderer {
    static renderGrid(container, groupedFiles) {
        container.innerHTML = Object.values(groupedFiles)
            .map(client => this.createClientBlock(client))
            .join('');
    }

    static createClientBlock(client) {
        return `
            <div class="client-file-block" data-client-id="${client.clientId}" data-ip="${client.ip}">
                <div class="client-block-header">
                    <div class="client-block-title">${client.clientId} | ${client.ip} | ${client.pcName}</div>
                </div>
                <div class="client-block-files">
                    ${client.textFile ? this.createFileItem('text', client.textFile.name, client.textFile.date) : ''}
                    ${client.imageFiles.length > 0 ? this.createFileItem('images', `Фото: ${client.imageFiles.length} шт.`, 'Все фото') : ''}
                </div>
                <button class="delete-block-btn">🗑 Удалить весь блок</button>
            </div>`;
    }

    static createFileItem(type, name, meta) {
        return `
            <div class="file-item" data-file-type="${type}">
                <div class="file-icon">${FileIcons[type] || FileIcons.default}</div>
                <div class="file-info">
                    <div class="file-name">${name}</div>
                    <div class="file-meta"><span>${meta}</span></div>
                </div>
                <div class="file-actions">
                    <button class="file-action-btn view-btn" title="Просмотр">👁</button>
                    <button class="file-action-btn delete-btn" title="Удалить">🗑</button>
                </div>
            </div>`;
    }
}