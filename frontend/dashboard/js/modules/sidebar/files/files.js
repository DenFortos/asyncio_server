// js/modules/sidebar/files/files.js

import { FilesManager } from './FilesManager.js';

let filesManagerInstance;

document.addEventListener('DOMContentLoaded', () => {
    // Инициализация менеджера, который будет работать с элементом с ID 'files-grid'
    filesManagerInstance = new FilesManager('files-grid', 'fileViewModal');

    // --- Расширенный набор тестовых данных ---
    const sampleData = [
        // --- Блок 1: Полный набор данных (Клиент 001) ---
        {
            clientId: 'Client_001',
            ip: '192.168.1.100',
            pcName: 'DESKTOP-123',
            textFile: {
                id: 1,
                name: 'passwords.json',
                date: '2025-04-01 10:30',
                size: '2.4 MB',
                content: '{ "browser": "chrome", "passwords": [...] }'
            },
            imageFiles: [
                // 🚨 ИСПРАВЛЕННЫЙ ПУТЬ: '../../images/' вместо '../images/'
                { name: 'scr_001.png', date: '2025-04-01 10:30', size: '1.2 MB', url: '../../images/test1.jpg' },
                { name: 'scr_002.png', date: '2025-04-01 10:31', size: '1.1 MB', url: '../../images/test2.jpg' },
                { name: 'scr_003.png', date: '2025-04-01 10:32', size: '1.3 MB', url: '../../images/test3.jpg' },
            ]
        },
        // --- Блок 2: Только текстовый файл (Клиент 002) ---
        {
            clientId: 'Client_002',
            ip: '10.0.0.50',
            pcName: 'LAPTOP-BOSS',
            textFile: {
                id: 2,
                name: 'report_Q1.txt',
                date: '2025-03-25 15:00',
                size: '10 KB',
                content: 'Confidential report summary here...'
            },
            imageFiles: []
        },
        // --- Блок 3: Только фото (Клиент 003) ---
        {
            clientId: 'Client_003',
            ip: '172.16.0.10',
            pcName: 'PC-SERVER',
            textFile: null,
            imageFiles: [
                // 🚨 ИСПРАВЛЕННЫЙ ПУТЬ
                { name: 'log_001.jpg', date: '2025-04-02 09:00', size: '0.8 MB', url: '../../images/test4.jpg' },
                { name: 'log_002.jpg', date: '2025-04-02 09:05', size: '1.5 MB', url: '../../images/test5.jpg' },
            ]
        }
    ];

    filesManagerInstance.updateData(sampleData);

    // ИНТЕГРАЦИЯ С ПОИСКОМ
    window.addEventListener('searchUpdated', (e) => {
        if (filesManagerInstance) {
            filesManagerInstance.filterBySearch(e.detail);
        }
    });
});