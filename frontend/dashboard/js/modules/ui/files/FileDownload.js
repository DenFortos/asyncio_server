export class FileDownload {
    static downloadText(textFile) {
        // Скачивание текстового файла
        const blob = new Blob([textFile.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        this.downloadFile(url, textFile.name);
    }

    static downloadImages(imageFiles) {
        // Скачивание всех изображений (можно архивом или по отдельности)
        imageFiles.forEach(img => {
            this.downloadFile(img.url, img.name);
        });
    }

    static downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    }
}