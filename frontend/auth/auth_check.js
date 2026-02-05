// frontend/auth/auth_check.js
(async function() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = '/sidebar/auth/auth.html';
        return;
    }

    try {
        const response = await fetch(`/verify_token?token=${token}`);
        if (!response.ok) throw new Error();
    } catch (err) {
        localStorage.clear();
        window.location.href = '/sidebar/auth/auth.html';
    }
})();