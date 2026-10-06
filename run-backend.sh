#!/bin/bash
# Launches the Flask backend. Use this instead of calling python directly.
#
# Why the DYLD_LIBRARY_PATH line: Homebrew's Python 3.14.7 ships a pyexpat
# (XML) module that needs a newer libexpat than macOS's system one, which
# breaks openpyxl (Excel export). Pointing at Homebrew's expat fixes it
# without modifying the Python install. If you don't have Homebrew expat,
# run: brew install expat  (CSV export works fine without it either way.)

cd "$(dirname "$0")" || exit 1
source .venv/bin/activate

if [ -d /opt/homebrew/opt/expat/lib ]; then
  export DYLD_LIBRARY_PATH="/opt/homebrew/opt/expat/lib:${DYLD_LIBRARY_PATH}"
fi

exec python3 -m backend.app
