// frontend/dashboard/js/modules/data/clients.js

/**
 * ХРАНИЛИЩЕ КЛИЕНТОВ В RAM ФРОНТЕНДА
 */
let clients = {};

// Функция уведомления системы об изменениях
const emit = () => window.dispatchEvent(new CustomEvent('clientsUpdated'));

export const updateClients = (list) => {
    list.forEach(c => {
        if (!c.id) return;
        // Сохраняем превью, если оно уже было в памяти, чтобы оно не исчезало при обновлении списка
        const currentPreview = clients[c.id]?.lastPreview;
        clients[c.id] = { ...clients[c.id], ...c };
        if (currentPreview) clients[c.id].lastPreview = currentPreview;
    });
    emit();
};

export const updateClient = (data) => {
    if (!data?.id) return;
    const currentPreview = clients[data.id]?.lastPreview;
    clients[data.id] = { ...clients[data.id], ...data };
    if (currentPreview) clients[data.id].lastPreview = currentPreview;
    emit();
};

/**
 * Установка новой ссылки на превью и очистка старой из RAM
 */
export const setClientPreview = (id, url) => {
    if (!clients[id]) {
        clients[id] = { id, status: 'online' };
    }
    
    // ОСВОБОЖДЕНИЕ ПАМЯТИ: Удаляем старый Blob, чтобы не было утечек в браузере
    if (clients[id].lastPreview && clients[id].lastPreview.startsWith('blob:')) {
        URL.revokeObjectURL(clients[id].lastPreview);
    }
    
    clients[id].lastPreview = url;
    
    // ВАЖНО: вызываем обновление, чтобы Renderer перерисовал карточку с новой картинкой
    emit(); 
};

export const getClientPreview = (id) => clients[id]?.lastPreview || null;

export const getAllClients = () => {
    return Object.values(clients).sort((a, b) => {
        const s = (b.status === 'online') - (a.status === 'online');
        return s || a.id.localeCompare(b.id);
    });
};