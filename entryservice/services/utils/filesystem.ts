import {promises as fsp} from "fs";
import path from "node:path";

export async function ensureDirectoryExists(dirPath: string) {
    try {
        // Проверяем, существует ли директория
        await fsp.access(dirPath);
    } catch (error) {
        // Если директория не существует, создаем её
        await fsp.mkdir(dirPath, { recursive: true });
    }
}

export async function getFilesInDirectory(dirPath: string) {
    try {
        const files = await fsp.readdir(dirPath); // Чтение содержимого директории
         // Формирование полного пути для каждого файла
        return files.map(file => path.join(dirPath, file));
    } catch (error: any) {
        console.error(`Ошибка при чтении директории: ${error.message}`);
        throw error;
    }
}

export async function removeDirectory(dirPath: string) {
    try {
        // Проверяем, существует ли директория
        await fsp.access(dirPath);

        // Удаляем директорию рекурсивно со всем содержимым
        await fsp.rm(dirPath, { recursive: true, force: true });
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.log(`Директория не существует: ${dirPath}`);
        } else {
            throw error;
        }
    }
}