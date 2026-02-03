export const FileIcons = {
    text: '📝',
    images: '📷',
    default: '📄'
};

export class FileCore {
    /** Группирует данные по клиентам */
    static groupByClient(filesData) {
        return filesData.reduce((acc, data) => {
            const key = `${data.clientId}_${data.ip}`;
            if (!acc[key]) {
                acc[key] = { ...data, imageFiles: data.imageFiles || [] };
            } else if (data.imageFiles) {
                acc[key].imageFiles = acc[key].imageFiles.concat(data.imageFiles);
            }
            return acc;
        }, {});
    }

    /** Создает HTML сетки */
    static renderGrid(container, groupedFiles) {
        container.innerHTML = Object.values(groupedFiles)
            .map(client => `
                <div class="client-file-block" data-client-id="${client.clientId}" data-ip="${client.ip}">
                    <div class="client-block-header">
                        <div class="client-block-title">${client.clientId} | ${client.ip} | ${client.pcName}</div>
                    </div>
                    <div class="client-block-files">
                        ${client.textFile ? this.createFileItem('text', client.textFile.name, client.textFile.date) : ''}
                        ${client.imageFiles.length > 0 ? this.createFileItem('images', `Фото: ${client.imageFiles.length} шт.`, 'Все фото') : ''}
                    </div>
                    <button class="delete-block-btn">🗑 Удалить весь блок</button>
                </div>`).join('');
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

    /** Скачивание */
    static download(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    }

    static downloadText(textFile) {
        const blob = new Blob([textFile.content], { type: 'text/plain' });
        this.download(URL.createObjectURL(blob), textFile.name);
    }
}