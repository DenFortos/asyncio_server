/* frontend-react/src/components/ui/StatusItem.jsx */

export const StatusItem = ({ text }) => (
    <div className="status-item">
        <span className="dot online"></span>
        <span className="status-text">{text}</span>
    </div>
);