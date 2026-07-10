#!/bin/bash
# Double-click this file to start the local render server and open the studio.
cd "$(dirname "$0")" || exit 1
PORT="${PORT:-8000}"
# open the browser a moment after the server comes up
( sleep 1.2; open "http://localhost:${PORT}/studio.html" ) &
PORT="$PORT" python3 server.py
