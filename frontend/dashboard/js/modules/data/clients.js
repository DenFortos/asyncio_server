// frontend/dashboard/js/modules/data/clients.js
let clients = {};

// Вспомогательная функция для уведомления системы об изменении данных
const emit = () => window.dispatchEvent(new CustomEvent('clientsUpdated'));

// Массовое обновление или инициализация списка клиентов
export const updateClients = (list) => {
    list.forEach(c => clients[c.id] = { ...clients[c.id], ...c });
    emit();
};

// Точечное обновление данных конкретного клиента (состояние, активность)
export const updateClient = (data) => {
    if (!data?.id || (!clients[data.id] && !data.pc_name)) return;
    clients[data.id] = { ...clients[data.id], ...data };
    emit();
};

// Установка URL превью (скриншота) для клиента с очисткой старых Blob-ссылок
export const setClientPreview = (id, url) => {
    const c = clients[id];
    if (!c) return;
    c.lastPreview?.startsWith('blob:') && URL.revokeObjectURL(c.lastPreview);
    c.lastPreview = url;
};

// Получение отсортированного списка клиентов: сначала online, затем по ID
export const getAllClients = () => Object.values(clients).sort((a, b) => 
    (b.status === 'online') - (a.status === 'online') || a.id.localeCompare(b.id)
);