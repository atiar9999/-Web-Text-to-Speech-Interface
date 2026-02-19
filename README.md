https://atiar9999.github.io/-Web-Text-to-Speech-Interface/
# 🎙️ Web Text-to-Speech Interface

A clean, browser-based text-to-speech tool that supports multiple languages including **Bengali**, with simple controls and local speech synthesis support.

Designed for privacy, accessibility, and seamless voice playback directly in your browser.

---

## ✨ Features

* 🌍 Multi-language voice support
* 🇧🇩 Bengali character detection
* 🎚 Adjustable speech speed
* 🎛 Playback controls (Play / Pause / Resume / Stop)
* 🔒 Fully local speech processing (no external APIs)

---

## 🚀 How to Use

1. Enter or paste text into the main input area.
2. Check the **language badge** — it indicates if Bengali characters are detected.
3. Select a voice from the dropdown list
   *(voices are grouped by language codes such as `bn` for Bengali)*.
4. Adjust the speech speed if needed.
5. Click **Speak** to begin playback.
6. Use **Pause**, **Resume**, or **Stop** to control speech.

---

## 🌐 Browser Compatibility

| Browser        | English | Bengali | Notes                                          |
| -------------- | ------- | ------- | ---------------------------------------------- |
| Chrome / Edge  | ✅       | ✅       | Best support; Bengali voices usually available |
| Firefox        | ✅       | ⚠️      | May require extra configuration                |
| Safari         | ✅       | ⚠️      | Depends on macOS language packs                |
| Chromium-based | ✅       | ✅       | Should behave like Chrome                      |

---

## 🐧 Linux Setup (Bengali Voice Support)

On Linux systems, browsers rely on **Speech Dispatcher** for speech synthesis.
If you see:

> **"No text-to-speech voices available"**

follow these steps.

---

### 📦 Install Required Packages

**Debian / Ubuntu**

```bash
sudo apt update
sudo apt install speech-dispatcher espeak-ng speech-dispatcher-espeak-ng
```

**Fedora**

```bash
sudo dnf install speech-dispatcher espeak-ng
```

**Arch / Manjaro / EndeavourOS**

```bash
sudo pacman -S speech-dispatcher espeak-ng
```

**openSUSE**

```bash
sudo zypper install speech-dispatcher espeak-ng
```

---

### ▶ Enable User Service

```bash
systemctl --user enable speech-dispatcher
systemctl --user start speech-dispatcher
```

Check status:

```bash
systemctl --user status speech-dispatcher
```

---

### 🔊 Test Speech Output

```bash
spd-say "Hello, this is a test"
espeak-ng "Hello"
espeak-ng -v bn "হ্যালো"
```

If audio plays successfully, your system is ready.

---

### 🔁 Restart Browser

Close **all browser windows**, then reopen.
Voices should now appear automatically.

---

### 🧩 Socket Check (If Still Not Working)

```bash
ls -l /run/user/$(id -u)/speech-dispatcher/speechd.sock
```

If missing, restart Speech Dispatcher.

---

## 🛠 Troubleshooting

**No voices detected**

* Restart browser
* Start service:

  ```bash
  systemctl --user start speech-dispatcher
  ```
* Install missing voice packages
* Try another browser
* Ensure this line is enabled in:

  ```
  /etc/speech-dispatcher/speechd.conf
  ```

  ```
  AddModule "espeak-ng"
  ```

---

**Bengali pronunciation incorrect**

* Choose a voice labeled **Bengali / Bangla / bn**
* Install additional language packs if unavailable

---

**No audio output**

* Verify system sound is working
* Check audio backend:

  ```bash
  pactl info
  ```

---

## 🤝 Contributing

Contributions are welcome and appreciated!

You can help by:

* Reporting bugs
* Suggesting new features
* Improving UI/UX
* Adding translations
* Enhancing accessibility

Open an **Issue** or submit a **Pull Request** to get started.

---

## 📄 License

Released under the **MIT License**.
See the `LICENSE` file for full details.

---

## ❤️ Acknowledgment

Built to provide a fast, private, and elegant text-to-speech experience directly in the browser.

---

✅ **If you want, I can also:**

* add badges (build, license, stars)
* add demo GIF section
* add screenshots section
* add API documentation section

Just tell me which style you prefer: **minimal**, **developer-focused**, or **showcase style**.
