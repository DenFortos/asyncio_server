/* frontend/dashboard/js/modules/data/clients.js
   ==========================================================================
   1. ХРАНИЛИЩЕ И СОБЫТИЯ (Storage & Events)
   ========================================================================== */
let clients = {};

// Утилита для отправки событий (чтобы UI знал об изменениях)
const emit = (name, detail = null) => window.dispatchEvent(new CustomEvent(name, { detail }));

/* ==========================================================================
   2. МЕТОДЫ ОБНОВЛЕНИЯ ДАННЫХ (Data Actions)
   ========================================================================== */

/** Инициализация списка (например, при загрузке страницы) */
export const updateClients = (list) => {
    clients = Object.fromEntries(list.map(c => [c.id, {
        ...c,
        status: 'offline',
        lastHB: 0
    }]));
    emit('clientsUpdated');
};

/** Обновление конкретного клиента (Heartbeat или изменение данных) */
export const updateClient = (data, isLive = false) => {
    if (!data?.id) return;

    const old = clients[data.id];

    /**
     * ЛОГИКА ОПРЕДЕЛЕНИЯ ОНЛАЙНА:
     * 1. Если пришел явный heartbeat (isLive === true).
     * 2. ИЛИ если это пакет с метаданными (есть pc_name), но в нем ОТСУТСТВУЕТ auth_key.
     * (Это значит, что пакет пришел напрямую от живого бота, а не из пуша БД).
     */
    const actuallyOnline = isLive || (data.pc_name && !data.auth_key);

    // Логируем для отладки, чтобы видеть кто "проснулся", а кто из базы
    if (data.pc_name) {
        console.log(`[DataUpdate] Bot: ${data.id} | Source: ${data.auth_key ? 'DATABASE' : 'LIVE BOT'} | Status: ${actuallyOnline ? 'ONLINE' : 'OFFLINE'}`);
    }

    clients[data.id] = {
        ...old,
        ...data,
        status: actuallyOnline ? 'online' : (old?.status || 'offline'),
        lastHB: actuallyOnline ? Date.now() : (old?.lastHB || 0)
    };

    // Если бота не было в списке (новый), шлем событие обновления всего списка, иначе только строки
    emit(old ? 'clientUpdated' : 'clientsUpdated', clients[data.id]);
};

/* ==========================================================================
   3. МОНИТОРИНГ И ВЫБОРКА (Monitoring & Getters)
   ========================================================================== */

/** Проверка таймаута (если бот не слал сигнал > 5 сек — он offline) */
export const checkDeadClients = () => {
    const now = Date.now();
    let changed = false;

    Object.values(clients).forEach(c => {
        if (c.status === 'online' && (now - c.lastHB) > 5000) {
            c.status = 'offline';
            changed = true;
        }
    });

    if (changed) emit('clientsUpdated');
};

/** Получение всех клиентов с сортировкой по IP */
export const getAllClients = () => {
    const toNum = ip => ip?.split('.').reduce((acc, octet) => (acc << 8) + (+octet), 0) >>> 0;
    return Object.values(clients).sort((a, b) => toNum(a.ip) - toNum(b.ip));
};