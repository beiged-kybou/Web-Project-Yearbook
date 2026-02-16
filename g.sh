#!/usr/bin/env bash

case "$1" in
  ishmam)
    git config --local user.name "Ishmam Tahmid"
    git config --local user.email "tahmid12955@gmail.com"
    ;;
  arian)
    git config --local user.name "Mubtasim Sajid Ahmed"
    git config --local user.email "mubtasimsajidahmedarian.11@gmail.com"
    ;;
  hasan)
    git config --local user.name "Mahmudul Hasan"
    git config --local user.email "mahmudulsakib3159@gmail.com"
    ;;
  *)
    echo "Usage: $0 {arian|hasan|ishmam}"
    exit 1
    ;;
esac

echo "Switched git identity to:"
git config --local user.name
git config --local user.email
