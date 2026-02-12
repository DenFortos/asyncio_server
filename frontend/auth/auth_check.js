// frontend/auth/auth_check.js
(async () => {
    const token = localStorage.getItem('auth_token');
    const redirect = () => {
        localStorage.clear();
        location.href = '/sidebar/auth/auth.html';
    };

    if (!token) return redirect();

    try {
        const res = await fetch(`/verify_token?token=${token}`);
        if (!res.ok) redirect();
    } catch {
        redirect();
    }
})();