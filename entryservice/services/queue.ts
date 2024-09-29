import * as mongoose from "mongoose";

const videoTaskSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        enum: ['rutube', 'plain'],
        required: true
    },
    status: {
        type: String,
        enum: ['downloading', 'whisper', 'summarization', 'generation'],
        required: true
    },
    started: {
        type: Date,
        default: Date.now
    },
    updated: {
        type: Date,
        default: Date.now // Устанавливаем значение по умолчанию
    },
    transcription: [{
        sentence: {
            type: String,
            required: true
        },
        start: {
            type: Number,
            required: true
        },
        end: {
            type: Number,
            required: true
        }
    }],
    captioning: {
        type: [String]
    },
    summary: {
        type: String
    },
    captioningSummary: {
        type: String
    },
    captioningSummaryRu: {
        type: String
    },
    fullSummary: {
        type: String
    },
    highlights: [{
        sentence: {
            type: String,
            required: true
        },
        start: {
            type: Number,
            required: true
        },
        end: {
            type: Number,
            required: true
        }
    }],
    clips: [String],
    generatedTitle: {
        type: String,
    },
    generatedDescription: {
        type: String,
    },
    generatedTags: {
        type: String,
    }
});

// Middleware для обновления поля updated перед сохранением
videoTaskSchema.pre('save', function (next) {
    // @ts-ignore
    this.updated = Date.now(); // Обновляем поле updated
    next();
});

// Создание модели на основе схемы
export const VideoTask = mongoose.model('VideoTask', videoTaskSchema);