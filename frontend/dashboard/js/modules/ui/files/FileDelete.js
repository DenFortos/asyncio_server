// js/modules/ui/files/FileDelete.js - ИСПРАВЛЕННЫЙ И ПОЛНЫЙ КОД

export class FileDelete {

    // 🚨 ДОБАВЛЕНЫ МЕТОДЫ ПОДТВЕРЖДЕНИЯ (ОНИ КРИТИЧНЫ ДЛЯ FilesManager.js!)

    /**
     * Показывает модальное окно подтверждения удаления одного файла.
     * @param {string} message - Сообщение для модального окна.
     * @param {Function} onConfirm - Колбэк, вызываемый при подтверждении.
     */
    static showConfirmation(message, onConfirm) {
        // Здесь должна быть логика показа вашего модального окна
        // Для примера, используем простой confirm() или кастомный модал

        // В продакшене замените это на вызов вашего кастомного модального окна:
        // document.getElementById('fileDeleteConfirmationModal').show(message, onConfirm);

        if (confirm(message)) {
            onConfirm();
        }
    }

    /**
     * Показывает модальное окно подтверждения удаления всего блока клиента.
     * @param {Object} clientData - Данные клиента.
     * @param {Function} onConfirm - Колбэк, вызываемый при подтверждении.
     */
    static showBlockConfirmation(clientData, onConfirm) {
        const message = `Вы уверены, что хотите удалить ВСЕ файлы клиента ${clientData.clientId} (${clientData.ip})? Это действие необратимо.`;

        // В продакшене замените это на вызов вашего кастомного модального окна:
        // document.getElementById('blockDeleteConfirmationModal').show(message, onConfirm);

        if (confirm(message)) {
            onConfirm();
        }
    }

    /**
     * Проверяет, является ли удаляемый элемент последним файлом в блоке.
     * @param {HTMLElement} fileElement - Удаляемый элемент файла (.file-item).
     * @returns {boolean}
     */
    static isLastItemInBlock(fileElement) {
        const clientBlockFiles = fileElement.closest('.client-block-files');
        if (!clientBlockFiles) return false;

        // Считаем все элементы 'file-item' внутри '.client-block-files'.
        // Если их 1 или меньше, значит, это последний элемент.
        const items = clientBlockFiles.querySelectorAll('.file-item');
        return items.length <= 1;
    }
}