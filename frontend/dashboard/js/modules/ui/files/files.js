// js/modules/ui/files/files.js
import { FilesManager } from './FilesManager.js';

// Глобальная переменная для доступа из других скриптов
let filesManager;

document.addEventListener('DOMContentLoaded', () => {
    filesManager = new FilesManager('files-grid', 'fileViewModal');
    window.filesManager = filesManager; // Доступ извне

    // Пример данных с тестовыми фото из папки images
    const sampleData = [
        {
            clientId: 'Client_001',
            ip: '192.168.1.100',
            pcName: 'DESKTOP-123',
            textFile: {
                id: 1,
                name: 'info.json',
                date: '2025-04-01 10:30',
                size: '2.4 MB',
                content: '{ "browser": "chrome", "passwords": [...] }'
            },
            imageFiles: [
                { name: 'screenshot_001.png', date: '2025-04-01 10:30', size: '1.2 MB', url: '../images/test1.jpg' },
                { name: 'screenshot_002.png', date: '2025-04-01 10:31', size: '1.1 MB', url: '../images/test2.jpg' },
                { name: 'screenshot_003.png', date: '2025-04-01 10:32', size: '1.3 MB', url: '../images/test3.jpg' },
                { name: 'screenshot_004.png', date: '2025-04-01 10:33', size: '1.0 MB', url: '../images/test4.jpg' },
                { name: 'screenshot_005.png', date: '2025-04-01 10:34', size: '1.4 MB', url: '../images/test5.jpg' }
            ]
        }
    ];

    filesManager.updateData(sampleData);
});

// Экспорт для глобального доступа
window.FilesManager = FilesManager;