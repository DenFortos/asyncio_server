/* frontend/dashboard/js/modules/data/clients.js */

let clients = {};
const emit = (name, detail = null) => window.dispatchEvent(new CustomEvent(name, { detail }));

/**
 * Инициализация списка ботов из БД.
 * Все боты по умолчанию получают статус offline.
 */
export const updateClients = (list) => {
    list.forEach(c => {
        const existing = clients[c.id];
        clients[c.id] = {
            ...c,
            status: 'offline', // Всегда оффлайн при начальной загрузке
            lastHB: 0,
            lastPreview: existing?.lastPreview || null
        };
    });
    emit('clientsUpdated');
};

/**
 * Обновление конкретного клиента.
 * Статус online ставится только если isLive === true.
 */
export const updateClient = (data, isLive = false) => {
    if (!data?.id) return;
    const old = clients[data.id];

    // Если пришел Heartbeat (isLive), ставим online и обновляем время пульса
    // Если просто пришли данные DataScribe, сохраняем текущий статус
    const newStatus = isLive ? 'online' : (old?.status || 'offline');
    const newHB = isLive ? Date.now() : (old?.lastHB || 0);

    clients[data.id] = {
        pc_name: 'Unknown',
        ip: '0.0.0.0',
        user: 'Unknown',
        ...old,
        ...data,
        status: newStatus,
        lastHB: newHB
    };

    // Генерируем события для перерисовки UI только при изменениях
    if (old?.status !== newStatus) {
        emit('clientsUpdated');
    } else {
        emit('clientUpdated', clients[data.id]);
    }
};

/**
 * Сохранение Blob-ссылки на превью
 */
export const setClientPreview = (id, url) => {
    if (!clients[id]) return;
    // Очищаем память от старого URL
    if (clients[id].lastPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(clients[id].lastPreview);
    }
    clients[id].lastPreview = url;
};

/**
 * Watchdog: Если бот молчит более 10 секунд — гасим его статус.
 * Должен работать синхронно с ботом (пинги раз в 5с).
 */
export const checkDeadClients = () => {
    const now = Date.now();
    let changed = false;

    Object.values(clients).forEach(c => {
        if (c.status === 'online' && (now - c.lastHB) > 10000) {
            console.log(`[Watchdog] Bot ${c.id} disconnected (Timeout 10s)`);
            c.status = 'offline';
            changed = true;
        }
    });

    if (changed) emit('clientsUpdated');
};

// Проверяем состояние каждые 2 секунды для быстрой реакции интерфейса
setInterval(checkDeadClients, 2000);

/**
 * Возвращает отсортированный список всех ботов
 */
export const getAllClients = () => {
    return Object.values(clients).sort((a, b) => {
        // Сначала живые, потом по алфавиту
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        return a.id.localeCompare(b.id);
    });
};