document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const regBtn = document.getElementById('regBtn');
    const msgDiv = document.getElementById('message');

    async function performAuth(type) {
        const login = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();

        if (!login || !pass) {
            showMessage('Fill all fields', 'error');
            return;
        }

        showMessage('Processing...', '');

        try {
            // Запросы на /login или /register к твоему API
            const response = await fetch(`/${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: login, password: pass })
            });

            const result = await response.json();

            if (result.status === 'ok') {
                if (type === 'login') {
                    showMessage('Access Granted. Redirecting...', 'success');

                    // Сохраняем все данные, полученные от API
                    localStorage.setItem('user_login', login);
                    localStorage.setItem('user_role', result.role);
                    localStorage.setItem('user_prefix', result.prefix);

                    setTimeout(() => {
                        // Переход в Dashboard
                        window.location.href = '/ui/dashboard/dashboard.html';
                    }, 1000);
                } else {
                    showMessage('Account created! You can login now.', 'success');
                }
            } else {
                showMessage(result.message || 'Authentication failed', 'error');
            }
        } catch (err) {
            console.error('Auth Error:', err);
            showMessage('Connection to C2 lost', 'error');
        }
    }

    function showMessage(text, className) {
        msgDiv.innerText = text;
        msgDiv.className = className;
    }

    loginBtn.addEventListener('click', () => performAuth('login'));
    regBtn.addEventListener('click', () => performAuth('register'));
});