export class FileGrouping {
    static groupByClient(filesData) {
        const grouped = {};

        filesData.forEach(data => {
            const key = `${data.clientId}_${data.ip}`;

            if (!grouped[key]) {
                grouped[key] = {
                    clientId: data.clientId,
                    ip: data.ip,
                    pcName: data.pcName,
                    textFile: null,
                    imageFiles: []
                };
            }

            if (data.textFile) {
                grouped[key].textFile = data.textFile;
            }
            if (data.imageFiles) {
                grouped[key].imageFiles = grouped[key].imageFiles.concat(data.imageFiles);
            }
        });

        return grouped;
    }
}