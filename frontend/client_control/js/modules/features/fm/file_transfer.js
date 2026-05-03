// frontend\client_control\js\modules\features\fm\file_transfer.js

/**
 * Модуль потоковой передачи файлов (DT и UT)
 */
export const FileTransfer = {
    _downloads: {}, // Хранилище для входящих файлов { fileName: { chunks: [], size, received } }

    /**
     * Инициализация скачивания (DT_START)
     * Вызывается, когда бот сообщает имя архива и его полный размер
     */
    handleDownloadStart: (fileName, totalSize) => {
        FileTransfer._downloads[fileName] = {
            chunks: [],
            size: parseInt(totalSize),
            received: 0
        };
        console.log(`[DT] Начинаем прием файла: ${fileName} (${totalSize} bytes)`);
    },

    /**
     * Получение чанка данных (DT_DATA)
     */
    handleDownloadData: (fileName, data) => {
        const session = FileTransfer._downloads[fileName];
        if (!session) {
            console.error(`[DT] Сессия для ${fileName} не найдена!`);
            return;
        }

        // ВАЖНО: Приводим к Uint8Array для корректного хранения в массиве Blob
        const chunk = data instanceof Uint8Array ? data : new Uint8Array(data);
        
        session.chunks.push(chunk);
        session.received += chunk.byteLength;

        // Лог прогресса раз в 1МБ или на финише
        if (session.received % (1024 * 1024) === 0 || session.received >= session.size) {
            const percent = ((session.received / session.size) * 100).toFixed(1);
            console.log(`[DT] Прогресс ${fileName}: ${percent}% (${session.received}/${session.size} bytes)`);
        }

        if (session.received >= session.size) {
            FileTransfer._finalizeDownload(fileName, session);
        }
    },

    /**
     * Финализация (сборка архива)
     */
    _finalizeDownload: (fileName, session) => {
        console.log(`[DT] Завершено. Сборка Blob для ${fileName}...`);
        
        try {
            // Создаем Blob из всех накопленных Uint8Array
            const blob = new Blob(session.chunks, { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = fileName; 
            
            document.body.appendChild(a);
            a.click();
            
            // Очистка
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                delete FileTransfer._downloads[fileName];
                console.log(`[DT] Файл ${fileName} успешно передан браузеру.`);
            }, 1000);
        } catch (err) {
            console.error("[DT] Ошибка при сборке финального файла:", err);
        }
    },

    /**
     * Загрузка файла на бот (UT)
     * Нарезает локальный файл на куски и отправляет через WebSocket
     */
    uploadFile: async (remotePath) => {
        const input = document.createElement('input');
        input.type = 'file';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Формируем чистый путь на удаленной машине
            const cleanDir = remotePath.replace(/\/$/, '').replace(/\\/g, '/');
            const fullRemotePath = `${cleanDir}/${file.name}`;
            const totalSize = file.size;

            console.log(`[UT] Подготовка к отправке: ${file.name} (${totalSize} bytes)`);

            // 1. Анонс (UT_START) - передаем размер как число
            window.sendToBot('FileManager', totalSize, 'UT_START', fullRemotePath, 'int');

            // 2. Отправка данных (UT_DATA)
            const chunkSize = 64 * 1024; // 64KB - оптимально для WebSocket
            let offset = 0;

            while (offset < totalSize) {
                const chunk = file.slice(offset, offset + chunkSize);
                const buffer = await chunk.arrayBuffer();
                
                // Отправляем бинарный пакет
                window.sendToBot('FileManager', buffer, 'UT_DATA', fullRemotePath, 'bin');
                
                offset += chunkSize;
                
                // Микро-пауза (backpressure), чтобы не "повесить" сетевой поток
                if (offset % (chunkSize * 10) === 0) {
                    await new Promise(r => setTimeout(r, 5));
                }
            }
            console.log(`[UT] Файл ${file.name} полностью отправлен на бот.`);
        };

        input.click();
    }
};