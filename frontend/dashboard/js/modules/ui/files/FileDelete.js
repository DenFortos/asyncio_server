export class FileDelete {
    static showConfirmation(message, onConfirm) {
        if (confirm(message)) {
            onConfirm();
        }
    }

    static showBlockConfirmation(clientData, onConfirm) {
        const message = `Вы действительно хотите удалить все файлы и фото клиента ${clientData.clientId}?`;
        this.showConfirmation(message, onConfirm);
    }
}