/* src/components/Auth.jsx */
import React, { useState } from 'react';
import { AuthInput } from './ui/AuthInput';
import AuthInfo from './auth/AuthInfo'; // Импортируем новый компонент
import '../styles/auth.css';

const Auth = () => {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(false);

    const handleAuth = async (type) => {
        if (!login || !password) return setMessage({ text: 'ERR: EMPTY_FIELDS', type: 'error' });
        setLoading(true);
        setMessage({ text: 'PROCESSING...', type: '' });

        try {
            const res = await fetch(`/api/${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password })
            });
            const data = await res.json();

            if (data.status === 'ok') {
                if (type === 'login') {
                    localStorage.setItem('auth_token', data.token || data.auth_token);
                    window.location.href = '/';
                } else {
                    setMessage({ text: 'ACCOUNT CREATED', type: 'success' });
                    setLoading(false);
                }
            } else { throw new Error(data.message || 'AUTH_FAILED'); }
        } catch (err) {
            setMessage({ text: `ERR: ${err.message}`, type: 'error' });
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="bg-grid"></div>
            <div className="auth-container">

                <AuthInfo /> {/* Весь брендинг теперь здесь */}

                <div className="auth-form-section">
                    <div className="form-header">
                        <h2>Authorization</h2>
                        <p>Welcome back, Operator.</p>
                    </div>

                    <div className="input-fields">
                        <AuthInput label="Operator ID" icon="fa-user-tag" value={login} onChange={setLogin} disabled={loading} />
                        <AuthInput label="Access Key" icon="fa-key" type="password" value={password} onChange={setPassword} disabled={loading} />
                    </div>

                    <div className="auth-actions">
                        <button className="btn-main" onClick={() => handleAuth('login')} disabled={loading}>Initialize Session</button>
                        <div className="divider"><span>or</span></div>
                        <button className="btn-sub" onClick={() => handleAuth('register')} disabled={loading}>Request Access</button>
                    </div>

                    <div id="message" className={message.type}>{message.text}</div>
                </div>
            </div>
        </div>
    );
};

export default Auth;