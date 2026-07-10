# Indic League Studio — how to run it

This makes the Instagram cover/story cards **and** the video reels. Video export
renders locally on **your own computer's graphics card** (via HyperFrames) —
nothing is uploaded anywhere, and it doesn't depend on the old broken
in-browser export.

You only need to do the one-time setup **once**. After that, starting it is a
single double-click.

---

## What you need (one-time setup)

Three things must be installed on the computer: **Python 3**, **Node.js**, and **ffmpeg**.
There's a one-click installer for each platform — you shouldn't need to type
any commands by hand.

### 🍎 On a Mac

1. **Right-click `install.command`** → **Open** → **Open** (this warning only
   appears the first time you run a downloaded script).
2. A black terminal window appears and installs everything automatically —
   it may ask for your Mac password partway through (you won't see it type,
   that's normal). Takes a few minutes.
3. When it says **"Setup complete"**, press Enter to close the window.

<details>
<summary>Prefer to type the commands yourself? (click to expand)</summary>

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install ffmpeg node
```
Python 3 already comes with macOS. Confirm everything worked with
`python3 --version`, `node --version`, `ffmpeg -version`.
</details>

### 🪟 On Windows

1. **Double-click `install.bat`**.
2. If a blue **"Windows protected your PC"** box appears, click **More info** →
   **Run anyway** (this only appears the first time).
3. It installs Python, Node.js, and ffmpeg automatically. When it's done,
   press Enter to close the window. If any line says "not recognized," close
   the window, reopen it, and double-click `install.bat` again (Windows needs
   a fresh window to notice new installs).

<details>
<summary>Prefer to type the commands yourself? (click to expand)</summary>

```powershell
winget install -e --id Python.Python.3.12
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Gyan.FFmpeg
```
No `winget`? Install Python from <https://python.org/downloads> (tick **"Add
Python to PATH"** during install), Node.js from <https://nodejs.org> (choose
the **LTS** version), and ffmpeg from <https://www.gyan.dev/ffmpeg/builds/>
(download "release full", unzip, and add its `bin` folder to your PATH).
</details>

### Also check: free disk space

Rendering needs breathing room to write temporary files — please have **at least
5 GB free** on the main drive. If the disk is nearly full, exports get slow or fail
partway through (and can produce a video with the logo or title missing). On a Mac,
check via **Apple menu → About This Mac → Storage**.

---

## Starting it (every time)

1. Keep all the files in **one folder** — don't split them up or move things out:
   `studio.html`, `server.py`, `start.command`, `start.bat`, `install.command`,
   `install.bat`, `the_indic_league_logo.png`, and the `hf-backend/` folder.
2. Start it:
   - **Mac:** double-click **`start.command`**
   - **Windows:** double-click **`start.bat`**
3. Your browser opens automatically at **http://localhost:8000/studio.html** — this
   is the exact same studio you're used to; nothing about the page changes.
4. Build your card / reel, then click **Download MP4**.
5. When you're done, close the little black/terminal window that opened (or press
   `Ctrl + C` in it).

That's it. ✅

### The first video you ever render will be slower

The **very first time** anyone clicks Download MP4 on a given computer, it
automatically downloads the HyperFrames renderer (~150–250 MB, needs internet,
one-time only). After that first download, every render is fast to *start* —
though rendering itself always takes a bit, see below.

### How long does rendering actually take?

This renders your video for real — compositing the title, logo, and fonts on
your graphics card — so it's not instant like a copy-paste. Expect roughly
**10–20 seconds** for a short reel, scaling up a bit for longer clips. That's
normal. The button shows *"Rendering on GPU (HyperFrames)…"* while it works.

---

## First-time warnings (these are normal)

- **Mac — "start.command can't be opened because it is from an unidentified developer":**
  **right-click** the file → **Open** → **Open**. You only have to do this once.
- **Mac — "Terminal wants access to files":** click **OK**.
- **Windows — blue "Windows protected your PC" box:** click **More info** → **Run anyway**.

---

## If something goes wrong

| What you see | Fix |
|---|---|
| Browser says **"can't connect" / "site can't be reached"** | The server window isn't running. Double-click `start.command` / `start.bat` again and wait ~2 seconds. |
| Server window flashes and closes instantly | Python isn't installed / not on PATH. Redo the setup step for your OS. |
| Export is slow, stalls, or the logo/title is missing from the finished video | Almost always **low disk space**. Free up a few GB and try again (see the disk-space note above). |
| Export toast says **"ffmpeg not found"** | ffmpeg isn't installed. Mac: `brew install ffmpeg`. Windows: `winget install -e --id Gyan.FFmpeg`, then reopen. |
| Export toast says **"HyperFrames backend not available"** | Node.js isn't installed, or isn't on PATH. Mac: `brew install node`. Windows: `winget install -e --id OpenJS.NodeJS.LTS`, then reopen. |
| **"Address already in use"** in the window | It's already running (or port 8000 is taken). Close other server windows, or start on another port — Mac: `PORT=8090 ./start.command`; Windows: `set PORT=8090` then run `start.bat`. |
| Video still won't export | You can drag `studio.html` straight into Chrome — it falls back to rendering in the browser. Slower and less reliable, but works without the server. |

---

## How it works (for the curious)

`studio.html` is the whole app — nothing about how it looks or works changes.
When it's opened through `server.py`, clicking **Download MP4** sends your video
and the title/settings to the local server, which builds and renders the final
video with **HyperFrames** on your computer's GPU. If HyperFrames or Node.js
isn't installed, it automatically falls back to an ffmpeg-based render, and if
neither is available, it falls back further to rendering in the browser —
something always works.

Nothing is uploaded to the internet — everything runs on your own computer.
