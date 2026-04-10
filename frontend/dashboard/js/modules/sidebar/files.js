/* frontend/dashboard/js/modules/sidebar/files.js */

const MIN_SKELETONS = 60; // Увеличили до 60 для теста общего скролла

export const FilesManager = {
    /**
     * Рендер секции файлов. 
     */
    render(filesData = []) {
        const grid = document.getElementById('files-grid');
        if (!grid) return;

        grid.innerHTML = '';

        // Используем реальные данные или расширенные тестовые
        const dataToRender = filesData.length > 0 ? filesData : this._getTestData();

        // 1. Отрисовка активных карточек
        dataToRender.forEach(bot => {
            grid.insertAdjacentHTML('beforeend', this._getCardTemplate(bot));
        });

        // 2. Добавление призраков (скелетов)
        const skeletonsNeeded = Math.max(0, MIN_SKELETONS - dataToRender.length);
        for (let i = 0; i < skeletonsNeeded; i++) {
            grid.insertAdjacentHTML('beforeend', this._getSkeletonCard());
        }
    },

    /**
     * Расширенные тестовые данные для проверки всех видов скролла
     */
    _getTestData() {
        return [
            { 
                id: 'WIN-7829-DESKTOP', 
                ip: '192.168.1.45', 
                loc: 'us', 
                archives: ['chrome_passwords.zip', 'cookies_session.zip'] 
            },
            { 
                id: 'WORK-STATION-01', 
                ip: '45.77.12.189', 
                loc: 'de', 
                // ТУТ 5 архивов для проверки внутреннего скроллбара (max 3 видимых)
                archives: ['desktop_stolen.zip', 'file_grabber.zip', 'telegram_data.zip', 'outlook_backup.zip', 'keys.zip'] 
            },
            { 
                id: 'LAPTOP-OFFICE', 
                ip: '172.16.0.4', 
                loc: 'gb', 
                archives: ['history.zip'] 
            },
            { 
                id: 'DEV-MACHINE-04', 
                ip: '91.210.45.2', 
                loc: 'ru', 
                archives: ['source_code.zip', 'credentials.zip', 'ssh_keys.zip', 'env_vars.zip'] 
            },
            { 
                id: 'USER-PC-TEST', 
                ip: '10.0.0.12', 
                loc: 'fr', 
                archives: ['backup_2026.zip'] 
            },
            { 
                id: 'HOME-PC-99', 
                ip: '187.45.1.33', 
                loc: 'br', 
                archives: ['passwords_v2.zip', 'wallets.zip', 'seed_phrases.zip'] 
            }
        ];
    },

    _getCardTemplate(bot) {
        const getFlag = (l) => (!l || l.length !== 2) ? '🏳️' : l.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));

        return `
            <div class="bot-file-card">
                <div class="bot-file-header">
                    <span class="flag-emoji">${getFlag(bot.loc)}</span>
                    <div class="bot-header-info">
                        <b>${bot.loc.toUpperCase()}</b>
                        <span class="header-sep">|</span>
                        <span>${bot.ip || '0.0.0.0'}</span>
                        <span class="header-sep">|</span>
                        <span class="bot-id-label">${bot.id}</span>
                    </div>
                </div>
                <div class="bot-file-content">
                    <div class="file-item keylogger">
                        <i class="fas fa-keyboard"></i>
                        <span>keylogs.txt</span>
                        <button class="file-action-btn" title="View Logs"><i class="fas fa-external-link-alt"></i></button>
                    </div>
                    <div class="archives-list">
                        <p class="small-label">Archives (${bot.archives?.length || 0}):</p>
                        <div class="scroll-area">
                            ${(bot.archives || []).map(zip => `
                                <div class="file-item zip">
                                    <i class="fas fa-file-archive"></i>
                                    <span>${zip}</span>
                                    <button class="file-action-btn" title="Download"><i class="fas fa-download"></i></button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>`;
    },

    _getSkeletonCard() {
        return `
            <div class="bot-file-card skeleton-card">
                <div class="bot-file-header">
                    <div class="skeleton-line" style="width: 80%;"></div>
                </div>
                <div class="bot-file-content">
                    <div class="skeleton-line skeleton-pulse" style="width: 100%; height: 28px; border-radius: 6px;"></div>
                    <div class="skeleton-line" style="width: 30%; margin-top: 5px;"></div>
                    <div class="skeleton-line skeleton-pulse" style="width: 100%; height: 28px; border-radius: 6px;"></div>
                </div>
            </div>`;
    }
};