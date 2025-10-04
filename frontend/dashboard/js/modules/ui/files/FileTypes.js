export class FileTypes {
    static icons = {
        text: '📝',
        image: '📷',
        default: '📄'
    };

    static getFileIcon(type) {
        return this.icons[type] || this.icons.default;
    }
}