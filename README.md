# COR to Timetable Converter

> Transform your USTP Certificate of Registration into an editable timetable and lockscreen wallpaper.

## Overview

A web-based tool that extracts course schedules from USTP COR PDFs and generates a clean, editable timetable. Perfect for students who want a quick overview of their weekly schedule or a beautiful lockscreen wallpaper for their phone.

## Features

| Feature | Description |
|---------|-------------|
| **PDF Parsing** | Upload your COR PDF, automatically extract courses, times, rooms, and faculty |
| **Editable Timetable** | Click any class to edit course code, time, room, or faculty |
| **Add/Delete Classes** | Add new classes or delete incorrect ones with confirmation |
| **Conflict Detection** | Real-time alerts when adding classes that overlap with existing schedules |
| **Lockscreen Wallpaper** | Generate a beautiful vertical schedule wallpaper for your phone |
| **Custom Sizes** | Choose from preset phone resolutions or enter custom dimensions |
| **Clean UI (maybe)** | Modern, responsive design that works on desktop and mobile |
| **No Data Upload** | All processing happens locally in your browser - your data never leaves your device |


## Getting Started

### Online (Recommended)
1. Visit [https://whatsmysched.netlify.app/](https://whatsmysched.netlify.app/)
2. Upload your USTP COR PDF
3. Review and edit your schedule
4. Save as lockscreen wallpaper
5. Send me gcash to avoid 2 years of bad luck

### Local Development
```bash
git clone https://github.com/chzn-ichi/cor-timetable.git
cd cor-timetable
# Open index.html in your browser
