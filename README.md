<h1 align="center">Bangla Typer</h1>

<p align="center">
  <strong>A modern Bangla typing trainer and YouTube subtitle processor</strong><br />
  Practice on real content. Process YouTube videos. Track your progress in real-time.
</p>

---

## 🎯 Why Bangla Typer?

Most typing tutors are designed for general English text. But Bangla typing has its own unique challenges—complex characters (Juktakkhor), unique vowel signs (Kar), and specific phonetics. 

**Bangla Typer** is built to bridge this gap. Instead of practicing on artificial word lists, you can practice on real literary content or even your favorite YouTube videos. It transforms subtitles into meaningful typing lessons, helping you master Bangla typing through the content you actually care about.

---

## ✨ Features

### 📂 Dynamic Content Processing
- **YouTube Integration**: Process any YouTube video to generate custom typing lessons from its subtitles.
- **Instant Mode**: Jump straight into typing with pre-loaded or dynamically fetched Bangla literary passages.
- **Auto-Formatting**: Automatically cleans and formats subtitles into readable pages and chapters.

### 📊 Real-Time Analytics
- **Live Metrics**: Track your WPM (Words Per Minute), Accuracy, and Consistency as you type.
- **Detailed History**: View your performance history with heatmaps and progress charts.
- **Best vs. Current**: Real-time comparison against your all-time best performance for every chapter.

### 🎨 Beautiful Customization
- **Multiple Themes**: Choose from high-contrast themes like Tokyo Night, Dracula, Nord, and various Neon modes.
- **Visual Aids**: Toggle "Hints" like key glowing, hand positioning guides, and step-by-step guides to improve your muscle memory.

### ⚙️ Modern Architecture
- **Real-Time Sync**: Automatically detects manual changes in your data folder—add a text file in your explorer, and it appears in the app instantly.
- **Dynamic Data Paths**: Change your data directory on the fly without ever needing to restart the application.
- **Fast & Lightweight**: Built with FastAPI and PySide6 for a responsive, desktop-native experience.

### 🔒 Privacy & Portability
- **100% Local**: No cloud accounts, no tracking. Your data stays on your machine.
- **Portable Design**: All settings, progress, and processed videos are stored in your selected data folder.

---

## 🚀 Quick Start

### Option 1: Download Binary (Easiest)
1. Download the latest release for your OS from the [releases page](https://github.com/mehad605/Bangla_Typer/releases/latest).
2. **Linux**: Install the `.deb` package
3. **Windows**: Run the `.exe` installer.

### Option 2: Run from Source

**Prerequisites**: Python 3.13+, Git

#### Using uv (Recommended)

```bash
git clone https://github.com/mehad605/Bangla_Typer.git
cd Bangla_Typer
uv sync
uv run gui.py
```

#### Using pip
```bash
git clone https://github.com/your-username/Bangla_Typer.git
cd Bangla_Typer
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install .
python gui.py
```

---

## 🛠️ Building from Source

### Automated Build (Linux & Windows)
```bash
uv run build.py
```
- **Linux**: Creates a `.deb` package and a portable `.tar.gz` in the root and `dist/` folders.
- **Windows**: Creates a standalone `.exe` in the `dist/` folder.

---

## 🤝 Contributing

Bangla Typer is an open-source project built with passion for the Bangla computing community. Contributions are welcome!

### Ways to Contribute
- **⭐ Star the Repository**: Help others discover the project.
- **🐛 Report Bugs**: Open an issue if you encounter any problems.
- **💡 Suggest Features**: Share your ideas for new functionality.
- **🔧 Submit Pull Requests**: Fix bugs or add new features yourself.

---

## 📄 License

**MIT License**

Copyright (c) 2024

---

<div align="center">

### ⭐ If you find Bangla Typer useful, please consider giving it a star!

**It helps other developers discover the project and motivates continued development.**

</div>

