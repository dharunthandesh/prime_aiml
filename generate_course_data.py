import os
import json
import re

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

base_dir = r'f:\PRIME'
modules = []
lesson_counter = 1
module_counter = 1

# Get all directories
dirs = [d for d in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, d))]
# Filter those that look like lesson folders (e.g., DAY 1, DAY 2, etc.)
dirs = [d for d in dirs if d.upper().startswith('DAY') or d.upper() == 'GSOC']
dirs.sort(key=natural_sort_key)

for d in dirs:
    dir_path = os.path.join(base_dir, d)
    files = [f for f in os.listdir(dir_path) if f.lower().endswith(('.mp4', '.mkv', '.webm', '.avi'))]
    files.sort(key=natural_sort_key)
    
    if not files:
        continue
        
    lessons = []
    for f in files:
        lessons.append({
            "id": f"l{lesson_counter}",
            "title": f,
            "duration": "Video",
            "description": f"Lesson from {d}",
            "completed": False,
            "videoSrc": f"{d}/{f}"
        })
        lesson_counter += 1
        
    modules.append({
        "id": f"m{module_counter}",
        "title": d,
        "lessons": lessons
    })
    module_counter += 1

courseData = {"modules": modules}

with open(os.path.join(base_dir, 'course_data.json'), 'w', encoding='utf-8') as f:
    json.dump(courseData, f, indent=4)

print("Generated course_data.json successfully.")
