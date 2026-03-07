import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
// Здесь будут твои стили для Dashboard
import './styles/auth.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                setChecking(false);
                return;
            }

            try {
                // Твой эндпоинт проверки токена через прокси /api
                const res = await fetch(`/api/verify_token?token=${token}`);
                if (res.ok) {
                    setIsAuthenticated(true);
                } else {
                    localStorage.clear();
                }
            } catch (err) {
                console.error("Auth check failed");
            } finally {
                setChecking(false);
            }
        };

        checkAuth();
    }, []);

    if (checking) return <div className="loading-screen">INITIALIZING...</div>;

    return (
        <div className="app">
            {!isAuthenticated ? (
                <Auth />
            ) : (
                <div className="dashboard">
                    <h1>SpectralWeb C2 Dashboard</h1>
                    <button onClick={() => { localStorage.clear(); window.location.reload(); }}>Logout</button>
                    {/* Сюда позже вставим Сайдбар и Список ботов */}
                </div>
            )}
        </div>
    );
}

export default App;