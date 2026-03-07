/* frontend-react/src/components/ui/AuthInput.jsx */

export const AuthInput = ({ label, icon, type = "text", value, onChange, disabled }) => (
    <div className="input-group">
        <label>{label}</label>
        <div className="input-wrapper">
            <i className={`fas ${icon}`}></i>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                placeholder={type === "password" ? "••••••••" : `Enter ${label}`}
            />
        </div>
    </div>
);