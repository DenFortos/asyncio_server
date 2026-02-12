// frontend/auth/auth.js
document.addEventListener('DOMContentLoaded', () => {
    const [loginBtn, regBtn, msgDiv] = ['loginBtn', 'regBtn', 'message'].map(id => document.getElementById(id));

    const showMsg = (text, cls = '') => {
        msgDiv.textContent = text;
        msgDiv.className = cls;
    };

    async function auth(type) {
        const [login, password] = ['username', 'password'].map(id => document.getElementById(id).value.trim());
        if (!login || !password) return showMsg('ERR: EMPTY_FIELDS', 'error');

        showMsg('PROCESSING...', '');
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
                    showMsg('ACCESS GRANTED', 'success');
                    ['auth_token', 'user_login', 'user_role', 'user_prefix'].forEach(key =>
                        localStorage.setItem(key, data[key.replace('auth_', '')] || data[key] || login));
                    setTimeout(() => location.href = '/sidebar/dashboard/dashboard.html', 800);
                } else {
                    showMsg('ACCOUNT CREATED', 'success');
                    loginBtn.disabled = regBtn.disabled = false;
                }
            } else {
                throw new Error(data.message || 'AUTH_FAILED');
            }
        } catch (err) {
            showMsg(`ERR: ${err.message}`, 'error');
            loginBtn.disabled = regBtn.disabled = false;
        }
    }

    loginBtn.onclick = () => auth('login');
    regBtn.onclick = () => auth('register');
});