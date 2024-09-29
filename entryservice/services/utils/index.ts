export function mergeSubtitles(subtitles: any, n: number = 2) {
    const merged = [];
    subtitles = subtitles.map((s: any) => JSON.parse(JSON.stringify(s)))

    let currentSegment = JSON.parse(JSON.stringify(subtitles[0])); // Текущий сегмент для слияния

    for (let i = 1; i < subtitles.length; i++) {
        const nextSegment = JSON.parse(JSON.stringify(subtitles[i]));

        if (!nextSegment) break

        // Проверяем, если разница между концом текущего сегмента и началом следующего меньше N секунд
        if (nextSegment.start - currentSegment.end <= n) {
            // Объединяем отрезки: выбираем самый ранний start и самый поздний end
            currentSegment.end = nextSegment.end;
            currentSegment.sentence += " " + nextSegment.sentence;
        } else {
            // Добавляем текущий сегмент в итоговый массив и обновляем текущий сегмент
            merged.push(currentSegment);
            currentSegment = nextSegment;
        }
    }

    // Добавляем последний сегмент
    merged.push(currentSegment);

    // Возвращаем самый длинный отрезок из объединенных
    return merged.reduce((longest, segment) => {
        const currentDuration = segment.end - segment.start;
        const longestDuration = longest.end - longest.start;

        return currentDuration > longestDuration ? segment : longest;
    });
}

export function trimTextBeforeChar(text: string, char: string): string {
    const index = text.indexOf(char); // Находим индекс первого вхождения символа
    if (index === -1) {
        return ''; // Если символ не найден, возвращаем пустую строку
    }
    return text.slice(index); // Возвращаем строку, начиная с символа
}

export function trimTextAfterLastChar(text: string, char: string): string {
    const index = text.lastIndexOf(char); // Находим индекс последнешл вхождения символа
    if (index === -1) {
        return ''; // Если символ не найден, возвращаем пустую строку
    }
    return text.slice(0, index); // Возвращаем строку, начиная с символа
}