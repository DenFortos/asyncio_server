// js/modules/sidebar/files/FileService.js

export const FileIcons = {
    text: '📝',
    images: '📷',
    default: '📄'
};

export class FileService {
    // Группировка данных по клиенту
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

    // Универсальное скачивание
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