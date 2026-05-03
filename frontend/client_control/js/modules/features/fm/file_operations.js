// frontend\client_control\js\modules\features\fm\file_operations.js

export const FileOperations = {
    sendControlCommand: (action, path) => {
        if (!window.sendToBot || !path) return;
        const targetPath = path.replace(/\\/g, '/');
        window.sendToBot('FileManager', {}, action, targetPath, 'str');
    },

    executeAction: (action, selectedItem, currentPath, refreshCallback) => {
        switch (action) {
            case 'run':
                if (selectedItem) {
                    FileOperations.sendControlCommand('RUN', selectedItem.path);
                }
                break;

            case 'delete':
                if (selectedItem && confirm(`Удалить ${selectedItem.name}?`)) {
                    FileOperations.sendControlCommand('DELETE', selectedItem.path);
                    // Сразу запрашиваем обновление текущей папки
                    if (refreshCallback) setTimeout(() => refreshCallback(currentPath), 100);
                }
                break;

            case 'mkdir':
                const name = prompt("Имя новой папки:", "Новая папка");
                if (name) {
                    const sep = (currentPath.endsWith('/') || currentPath.endsWith('\\')) ? '' : '/';
                    const fullPath = currentPath === "Computer" ? name : `${currentPath}${sep}${name}`;
                    FileOperations.sendControlCommand('MKDIR', fullPath);
                    // Сразу запрашиваем обновление текущей папки
                    if (refreshCallback) setTimeout(() => refreshCallback(currentPath), 200);
                }
                break;
        }
    }
};