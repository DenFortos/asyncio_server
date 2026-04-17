// frontend\dashboard\js\modules\sidebar\files.js
// Менеджер отображения списка украденных файлов и архивов
const MIN_SKELETONS = 60;

export const FilesManager = {
    // Основной метод рендера сетки файлов с поддержкой реальных данных и скелетов
    render(filesData = []) {
        const grid = document.getElementById('files-grid');
        if (!grid) return;

        const data = filesData.length ? filesData : this._getTestData();
        const cards = data.map(bot => this._getCardTemplate(bot)).join('');
        const skels = this._getSkeletonCard().repeat(Math.max(0, MIN_SKELETONS - data.length));

        grid.innerHTML = cards + skels;
    },

    // Мок-данные для демонстрации и тестирования интерфейса
    _getTestData: () => [
        { id: 'WIN-7829-DESKTOP', ip: '192.168.1.45', loc: 'us', archives: ['chrome_passwords.zip', 'cookies_session.zip'] },
        { id: 'WORK-STATION-01', ip: '45.77.12.189', loc: 'de', archives: ['stolen.zip', 'grabber.zip', 'tg.zip', 'backup.zip', 'keys.zip'] },
        { id: 'LAPTOP-OFFICE', ip: '172.16.0.4', loc: 'gb', archives: ['history.zip'] },
        { id: 'DEV-MACHINE-04', ip: '91.210.45.2', loc: 'ru', archives: ['src.zip', 'cred.zip', 'ssh.zip', 'env.zip'] }
    ],

    // Шаблон карточки клиента со списком файлов и архивов
    _getCardTemplate(bot) {
        const getFlag = l => (!l || l.length !== 2) ? '🏳️' : l.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
        
        return `
            <div class="bot-file-card">
                <div class="bot-file-header">
                    <span class="flag-emoji">${getFlag(bot.loc)}</span>
                    <div class="bot-header-info">
                        <b>${bot.loc.toUpperCase()}</b> <span class="header-sep">|</span>
                        <span>${bot.ip || '0.0.0.0'}</span> <span class="header-sep">|</span>
                        <span class="bot-id-label">${bot.id}</span>
                    </div>
                </div>
                <div class="bot-file-content">
                    <div class="file-item keylogger">
                        <i class="fas fa-keyboard"></i> <span>keylogs.txt</span>
                        <button class="file-action-btn"><i class="fas fa-external-link-alt"></i></button>
                    </div>
                    <div class="archives-list">
                        <p class="small-label">Archives (${bot.archives?.length || 0}):</p>
                        <div class="scroll-area">
                            ${(bot.archives || []).map(zip => `
                                <div class="file-item zip">
                                    <i class="fas fa-file-archive"></i> <span>${zip}</span>
                                    <button class="file-action-btn"><i class="fas fa-download"></i></button>
                                </div>`).join('')}
                        </div>
                    </div>
                </div>
            </div>`;
    },

    // Шаблон состояния загрузки (скелет)
    _getSkeletonCard: () => `
        <div class="bot-file-card skeleton-card">
            <div class="bot-file-header"><div class="skeleton-line" style="width: 80%;"></div></div>
            <div class="bot-file-content">
                <div class="skeleton-line skeleton-pulse" style="width: 100%; height: 28px; border-radius: 6px;"></div>
                <div class="skeleton-line" style="width: 30%; margin-top: 5px;"></div>
                <div class="skeleton-line skeleton-pulse" style="width: 100%; height: 28px; border-radius: 6px;"></div>
            </div>
        </div>`
};