/* src/components/auth/AuthInfo.jsx */
import React from 'react';
import { StatusItem } from '../ui/StatusItem';

const AuthInfo = () => (
    <div className="auth-info">
        <div className="brand-box">
            <div className="main-icon">
                <i className="fas fa-shield-halved"></i>
            </div>
            <h1 className="brand-title">Spectral</h1>
            <p className="brand-subtitle">Advanced Control Protocol</p>
        </div>

        <div className="system-status">
            <StatusItem text="Core System: Active" />
            <StatusItem text="Network: Encrypted" />
        </div>
    </div>
);

export default AuthInfo;