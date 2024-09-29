import express, {Express, Request, Response} from "express";
import dotenv from "dotenv";
import cors from 'cors'
import {upload} from "./services/uploads";
import {getVideoInfo} from "./services/rutube";
import bodyParser from "body-parser";
import {VideoTask} from "./services/queue";
import mongoose from "mongoose";
import {ProcessingQueue} from "./services/processing";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URL || '');

app.use(bodyParser.json());
app.use(cors())
app.use('/uploads', express.static('uploads'))

// @ts-ignore
app.use((err, req, res, next) => {
    console.log("got error");
    console.error(err.stack);

    // replace this with whatever UI you want to show the user
    res.status(500).send('Something broke!');
});

const processingQueue = new ProcessingQueue()

app.get("/ping", (req: Request, res: Response) => {
    res.send("pong");
});

app.post('/uploadVideo', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).send('No file uploaded.');
        }

        const uuid = req.file!.filename.split('.')[0]; // Получаем UUID из имени файла (без расширения)

        res.status(200).json({
            message: 'File uploaded successfully.',
            fileName: req.file!.filename,
            filePath: `/uploads/${req.file!.filename}`,
            id: req.file!.filename.split('.')[0]
        });
    } catch (error: any) {
        res.status(500).json({error: error.message});
    }
});

app.post('/getRutubeVideoInfo', async (req, res) => {
    getVideoInfo(req.body.rutubeUrl)
        .then(r => res.json(r))
        .catch(e => res.status(500).send(e.message))
})

app.post('/processPlainVideo', async (req, res) => {
    const videoTask = new VideoTask({
        id: req.body.id,
        status: 'whisper',
        type: 'plain'
    })

    await videoTask.save()

    processingQueue.startProcessing(req.body.id)

    res.json(videoTask)
})

app.post('/processRutubeVideo', (req, res) => {
    console.log(req.body.videoUrl)
})

// Эндпоинт для получения обработанного видео по ID
app.get('/getProcessedVideo/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const videoTask = await VideoTask.findOne({ id });
        if (!videoTask) {
            res.status(404).json({ message: 'Video task not found' });
            return
        }
        res.status(200).json(videoTask);
    } catch (error) {
        console.error(error);
    }
});

// Эндпоинт для получения всех ожидающих видео
app.get('/getAllQueuedVideos', async (req: Request, res: Response) => {
    try {
        const queuedVideos = await VideoTask.find();
        res.status(200).json(queuedVideos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});