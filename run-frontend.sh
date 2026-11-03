#!/bin/bash
# Launches the React (Vite) dev server. Run the backend separately with
# ./run-backend.sh in another terminal.

cd "$(dirname "$0")/frontend" || exit 1
exec npm run dev
