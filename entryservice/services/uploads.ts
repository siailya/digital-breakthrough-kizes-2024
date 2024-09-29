import multer from "multer";
import fs from "node:fs";
import {v4 as uuidv4} from "uuid";
import path from "node:path";
import {Express, Request} from "express";

export const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';

        // Проверяем наличие директории, если нет - создаем
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }

        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Генерируем уникальный идентификатор для имени файла
        const uniqueName = uuidv4();
        const fileExt = path.extname(file.originalname); // сохраняем расширение файла
        cb(null, `${uniqueName}${fileExt}`);
    }
});

// Фильтр по типу файла
export const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['.mp4', '.avi'];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(fileExt)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only MP4 and AVI are allowed.'));
    }
};

// Настройка multer
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 350 } // Ограничение 300Мб
});