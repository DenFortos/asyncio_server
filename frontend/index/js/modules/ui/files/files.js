// Глобальные переменные
let filesData = [];
let groupedFiles = {};

// Иконки для разных типов файлов
const fileIcons = {
    image: '📷',
    text: '📝',
    json: '📄',
    code: '💻',
    archive: '📦',
    default: '📄'
};

// Типы файлов
const fileTypes = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    text: ['txt', 'log'],
    json: ['json'],
    code: ['js', 'css', 'html', 'xml', 'py', 'java', 'cpp', 'c', 'php'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz']
};

// Группировка файлов по клиентам
function groupFilesByClient() {
    groupedFiles = {};

    filesData.forEach(file => {
        const key = `${file.clientId}_${file.ip}`;

        if (!groupedFiles[key]) {
            groupedFiles[key] = {
                clientId: file.clientId,
                ip: file.ip,
                pcName: file.pcName,
                files: []
            };
        }

        groupedFiles[key].files.push(file);
    });
}

// Определение типа файла
function getFileType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();

    for (const [type, extensions] of Object.entries(fileTypes)) {
        if (extensions.includes(ext)) {
            return type;
        }
    }

    return 'default';
}

// Получение иконки файла
function getFileIcon(fileName) {
    const type = getFileType(fileName);
    return fileIcons[type] || fileIcons.default;
}

// Рендеринг сетки файлов
function renderFilesGrid() {
    const grid = document.getElementById('files-grid');
    grid.innerHTML = '';

    Object.entries(groupedFiles).forEach(([key, clientData]) => {
        const block = createClientBlock(clientData);
        grid.appendChild(block);
    });
}

// Создание блока клиента
function createClientBlock(clientData) {
    const block = document.createElement('div');
    block.className = 'client-file-block';
    block.dataset.clientId = clientData.clientId;
    block.dataset.ip = clientData.ip;

    const fileCount = clientData.files.length;

    block.innerHTML = `
        <div class="client-block-header">
            <div class="client-block-title">
                ${clientData.clientId} | ${clientData.ip} | ${clientData.pcName}
            </div>
            <div class="client-block-info">[${fileCount} файл${fileCount > 1 ? 'а' : ''}]</div>
        </div>
        <div class="client-block-files">
            ${clientData.files.map(file => createFileItem(file)).join('')}
        </div>
        <button class="delete-block-btn" data-client-id="${clientData.clientId}">
            🗑 Удалить весь блок
        </button>
    `;

    // Добавляем обработчики событий для файлов
    clientData.files.forEach(file => {
        const fileElement = block.querySelector(`[data-file-id="${file.id}"]`);
        if (fileElement) {
            setupFileActions(fileElement, file);
        }
    });

    // Обработчик удаления блока
    const deleteBtn = block.querySelector('.delete-block-btn');
    deleteBtn.addEventListener('click', () => showDeleteConfirmation(block, clientData));

    return block;
}

// Создание элемента файла
function createFileItem(file) {
    const icon = getFileIcon(file.fileName);
    const fileType = getFileType(file.fileName);

    let previewHtml = '';
    if (fileType === 'image') {
        previewHtml = `<img src="#" alt="Preview" class="file-preview" data-file-id="${file.id}">`;
    }

    return `
        <div class="file-item" data-file-id="${file.id}">
            <div class="file-icon">${icon}</div>
            <div class="file-info">
                <div class="file-name">${file.fileName}</div>
                <div class="file-meta">
                    <span>${file.date}</span>
                    <span>${file.size}</span>
                </div>
                ${previewHtml}
            </div>
            <div class="file-actions">
                <button class="file-action-btn view-btn" title="Просмотр">👁</button>
                <button class="file-action-btn download-btn" title="Скачать">⬇</button>
                <button class="file-action-btn delete-btn" title="Удалить">🗑</button>
            </div>
        </div>
    `;
}

// Настройка действий для файла
function setupFileActions(fileElement, file) {
    const viewBtn = fileElement.querySelector('.view-btn');
    const downloadBtn = fileElement.querySelector('.download-btn');
    const deleteBtn = fileElement.querySelector('.delete-btn');

    if (viewBtn) {
        viewBtn.addEventListener('click', () => viewFile(file));
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => downloadFile(file));
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteFile(file, fileElement));
    }
}

// Просмотр файла
function viewFile(file) {
    const modal = document.getElementById('fileViewModal');
    const title = document.getElementById('fileModalTitle');
    const body = document.getElementById('fileModalBody');

    title.textContent = `Просмотр: ${file.fileName}`;

    const fileType = getFileType(file.fileName);

    if (fileType === 'image') {
        body.innerHTML = `<img src="#" alt="${file.fileName}" class="file-content-preview">`;
    } else {
        // Для текстовых файлов
        body.innerHTML = `
            <pre class="file-content-text">[Содержимое файла: ${file.fileName}]</pre>
        `;
    }

    modal.style.display = 'block';
}

// Скачивание файла
function downloadFile(file) {
    // Здесь будет реализация скачивания через WebSocket
    console.log(`Запрос на скачивание файла: ${file.fileName}`);
}

// Удаление файла
function deleteFile(file, fileElement) {
    if (confirm(`Вы действительно хотите удалить файл ${file.fileName}?`)) {
        // Здесь будет реализация удаления через WebSocket
        fileElement.remove();
        updateFileCounts();
    }
}

// Показ подтверждения удаления блока
function showDeleteConfirmation(block, clientData) {
    const overlay = document.createElement('div');
    overlay.className = 'confirmation-overlay';
    overlay.innerHTML = `
        <div class="confirmation-modal">
            <div class="confirmation-title">Подтверждение удаления</div>
            <div class="confirmation-text">
                Вы действительно хотите удалить все файлы клиента
                <strong>${clientData.clientId}</strong>
                без возможности восстановления?
            </div>
            <div class="confirmation-buttons">
                <button class="btn-cancel">Отмена</button>
                <button class="btn-confirm">Удалить</button>
            </div>
        </div>
    `;

    block.appendChild(overlay);

    const cancelBtn = overlay.querySelector('.btn-cancel');
    const confirmBtn = overlay.querySelector('.btn-confirm');

    cancelBtn.addEventListener('click', () => {
        overlay.remove();
    });

    confirmBtn.addEventListener('click', () => {
        // Удаление блока
        block.remove();
        delete groupedFiles[`${clientData.clientId}_${clientData.ip}`];
        overlay.remove();
    });
}

// Обновление счетчиков файлов
function updateFileCounts() {
    // Перегруппировка и перерендеринг при необходимости
    groupFilesByClient();
    renderFilesGrid();
}

// Настройка глобальных обработчиков
function setupEventListeners() {
    // Закрытие модального окна просмотра
    const closeBtn = document.getElementById('closeFileModal');
    const modal = document.getElementById('fileViewModal');

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Кнопка копирования содержимого
    document.getElementById('copyFileContent').addEventListener('click', () => {
        // Реализация копирования содержимого
        console.log('Копирование содержимого файла');
    });

    // Кнопка скачивания в модальном окне
    document.getElementById('downloadFileModal').addEventListener('click', () => {
        // Реализация скачивания
        console.log('Скачивание файла');
    });
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    // Пример данных
    filesData = [
        { id: 1, clientId: 'Client_001', ip: '192.168.1.100', fileName: 'screenshot_001.png', date: '2025-04-01 10:30', size: '2.4 MB', pcName: 'DESKTOP-123' },
        { id: 2, clientId: 'Client_001', ip: '192.168.1.100', fileName: 'report.json', date: '2025-04-01 10:32', size: '0.8 MB', pcName: 'DESKTOP-123' },
        { id: 3, clientId: 'Client_001', ip: '192.168.1.100', fileName: 'log.txt', date: '2025-04-01 10:35', size: '0.5 MB', pcName: 'DESKTOP-123' },
        { id: 4, clientId: 'Client_002', ip: '192.168.1.101', fileName: 'screen_001.png', date: '2025-04-01 11:20', size: '1.8 MB', pcName: 'LAPTOP-456' },
        { id: 5, clientId: 'Client_002', ip: '192.168.1.101', fileName: 'config.json', date: '2025-04-01 11:22', size: '0.3 MB', pcName: 'LAPTOP-456' }
    ];

    groupFilesByClient();
    renderFilesGrid();
    setupEventListeners();
});

// Функция для обновления данных (будет вызываться извне)
function updateFilesData(newFilesData) {
    filesData = newFilesData;
    groupFilesByClient();
    renderFilesGrid();
}

// Экспорт функций
window.updateFilesData = updateFilesData;