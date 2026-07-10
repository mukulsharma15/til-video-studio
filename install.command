#!/bin/bash
# Double-click this ONCE to install everything Indic League Studio needs.
# Safe to run more than once — it skips anything already installed.
set -e
cd "$(dirname "$0")" || exit 1

echo "╭──────────────────────────────────────────╮"
echo "│  Indic League Studio — one-time setup      │"
echo "╰──────────────────────────────────────────╯"
echo

# ── Homebrew ──
if ! command -v brew >/dev/null 2>&1; then
  echo "→ Installing Homebrew (this may ask for your Mac password)…"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Apple Silicon Homebrew lives in /opt/homebrew and isn't on PATH yet in this shell
  if [ -x /opt/homebrew/bin/brew ]; then eval "$(/opt/homebrew/bin/brew shellenv)"; fi
else
  echo "✓ Homebrew already installed"
fi

# ── ffmpeg + node ──
echo "→ Installing ffmpeg and Node.js (skips anything already installed)…"
brew install ffmpeg node

echo
echo "── Checking versions ──"
python3 --version 2>&1 || echo "✗ python3 not found — this shouldn't happen on macOS, contact for help"
node --version 2>&1 && echo "  ^ Node.js" || echo "✗ node not found"
ffmpeg -version 2>&1 | head -1

echo
echo "✓ Setup complete. Now double-click start.command to open the studio."
echo
read -p "Press Enter to close this window…"
