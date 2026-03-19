// frontend/auth/auth.js

/* ==========================================================================
   0. АВТО-ПРОВЕРКА СЕССИИ
========================================================================== */
(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
        const res = await fetch(`/verify_token?token=${encodeURIComponent(token)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.status === 'ok' && data.login) {
                localStorage.setItem('user_login', data.login);
                window.location.href = '/sidebar/dashboard/dashboard.html';
                return;
            }
        }
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_login');
    } catch (e) { /* Игнорируем ошибки сети, показываем форму */ }
})();

/* ==========================================================================
   1. ИНИЦИАЛИЗАЦИЯ ФОРМЫ
========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    const [loginBtn, regBtn, msgDiv] = ['loginBtn', 'regBtn', 'message'].map(id => document.getElementById(id));
    if (!loginBtn) return;

    const showMsg = (text, cls = '') => { msgDiv.textContent = text; msgDiv.className = cls; };

    async function auth(type) {
        const login = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        if (!login || !password) return showMsg('ERR: EMPTY_FIELDS', 'error');

        loginBtn.disabled = regBtn.disabled = true;
        try {
            const res = await fetch(`/${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password })
            });
            const data = await res.json();

            if (data.status === 'ok') {
                if (type === 'login') {
                    ['auth_token', 'user_login', 'user_role', 'user_prefix'].forEach(k => 
                        localStorage.setItem(k, data[k.replace('auth_', '')] || data[k] || login));
                    setTimeout(() => location.href = '/sidebar/dashboard/dashboard.html', 500);
                } else {
                    showMsg('ACCOUNT CREATED', 'success');
                    loginBtn.disabled = regBtn.disabled = false;
                }
            } else throw new Error(data.message || 'AUTH_FAILED');
        } catch (err) {
            showMsg(`ERR: ${err.message}`, 'error');
            loginBtn.disabled = regBtn.disabled = false;
        }
    }

    loginBtn.onclick = () => auth('login');
    regBtn.onclick = () => auth('register');
});