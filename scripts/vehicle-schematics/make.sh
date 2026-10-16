#!/bin/sh
# Użycie: ./make.sh <klucz> [...]  - generuje models/<klucz>.svg z .py (jeśli jest) i składa arkusz.
cd "$(dirname "$0")"
for k in "$@"; do
  if [ -f "models/$k.py" ]; then python3 "models/$k.py" > "models/$k.svg" || exit 1; fi
done
node build.mjs "$@"
