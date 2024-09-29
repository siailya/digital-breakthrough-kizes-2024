import os
import subprocess
import argparse


def extract_frames(video_path, output_dir, fps=5):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    command = f"ffmpeg -i {video_path} -vf fps={fps} {output_dir}/frame_%04d.png -hide_banner"
    subprocess.call(command, shell=True)

def extract_audio(video_path, output_audio_path):
    command = f"ffmpeg -i {video_path} -ac 1 {output_audio_path} -hide_banner"
    subprocess.call(command, shell=True)

def split_video(video_path, output_dir, duration=60):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    command = f"ffmpeg -i {video_path} -c copy -map 0 -segment_time {duration} -f segment -reset_timestamps 1 {output_dir}/part_%03d.mp4 -hide_banner"
    subprocess.call(command, shell=True)

def process_video(args):
    extract_frames(args.videoPath, args.framesOutputDir)
    extract_audio(args.videoPath, args.audioOutputPath)
    split_video(args.videoPath, args.shortsOutputDir, args.duration)


def convert_seconds_to_srt_format(seconds):
    hours, remainder = divmod(seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = (seconds - int(seconds)) * 1000
    return f"{int(hours):02}:{int(minutes):02}:{int(seconds):02},{int(milliseconds):03}"

def json_to_srt(json_data, output_srt_path):
    with open(output_srt_path, 'w', encoding='utf-8') as f:
        for i, entry in enumerate(json_data['timesteps']):
            start_time = convert_seconds_to_srt_format(entry['start'])
            end_time = convert_seconds_to_srt_format(entry['end'])
            text = entry['text']
            
            f.write(f"{i + 1}\n")
            f.write(f"{start_time} --> {end_time}\n")
            f.write(f"{text}\n\n")

def add_subtitles(video_path, subtitle_path, output_path, hardcoded=True):
    if hardcoded:
        command = f"ffmpeg -i {video_path} -vf subtitles={subtitle_path}:force_style='Fontsize=24,PrimaryColour=&H0000ff&' -c:a copy {output_path}"
    else:
        command = f"ffmpeg -i {video_path} -i {subtitle_path} -c copy -c:s mov_text {output_path}"
    
    subprocess.call(command, shell=True)

json_data = {
  "timesteps": [
    {"start": 1.0, "end": 4.0, "text": "Пример текста субтитра."},
    {"start": 5.0, "end": 8.0, "text": "Еще один текст субтитра."}
  ]
}

json_to_srt(json_data, "output_subtitles.srt")

add_subtitles("input_video.mp4", "output_subtitles.srt", "output_video_with_subs.mp4", hardcoded=True)









if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    
    parser.add_argument('--videoPath', type=str, required=True, help="Путь до видеофайла.")
    parser.add_argument('--framesOutputDir', type=str)
    parser.add_argument('--audioOutputPath', type=str)
    parser.add_argument('--shortsOutputDir', type=str )
    parser.add_argument('--duration', type=int, default=60)

    args = parser.parse_args()

    process_video(args)