# KIZES


Запуск и деплой
------------------------------------
У нас имеется 6 моделей: SDXL для генерации побложки видео, Whisper для генерации субтитров, xTTS для генерации аудио, если мы хотим делать какой-либо краткий пересказ в шортсе, BLIP описывающий видео, TalkNet для трекинга лиц и LLama для генерации текста.

Все модели запускаются в отдельном докер-контейнере. Dockerfile'ы лежат в папке каждой модели отдельно вместе с compose.yml, где есть допольнительно поднимающийся ngrok для того, чтобы можно было достучаться до модели снаружи.

Если хочется запустить модели вместе c ngrok, то следует написать команду `docker compose -f {название compose.yml} up --build -d`.

Чтобы запустить по отдельности без ngrok, то можно написать
1. `docker build .`
2. `docker run -it --gpus all --name {ваше название} {id docker image}`