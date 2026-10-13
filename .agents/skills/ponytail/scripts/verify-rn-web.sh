#!/usr/bin/env bash
# Template: ad-hoc verification for a React Native / Expo-web layout fix.
# Copy, set ROOT + SRC + the grep patterns, run. Plain if/grep only — no eval/quoting
# helpers (those emit false FAILs that re-trigger a verification gate).
# Bundle grep uses the SINGLE-QUOTE form Expo-web minifies styles into (e.g. width:'60%').
set -u
ROOT="$(git rev-parse --show-toplevel)/.codebase"
SRC="$ROOT/src/features/universal/LandingPage.tsx"
JS=$(ls "$ROOT"/dist/_expo/static/js/web/*.js 2>/dev/null | head -1)
PASS=0; FAIL=0

# --- source assertions (edit patterns to match your change) ---
if ! grep -q 'hero:.*maxWidth: 560' "$SRC"; then echo "PASS  hero uncapped"; PASS=$((PASS+1)); else echo "FAIL  hero uncapped"; FAIL=$((FAIL+1)); fi
if ! grep -q 'section:.*maxWidth: 560' "$SRC"; then echo "PASS  section uncapped"; PASS=$((PASS+1)); else echo "FAIL  section uncapped"; FAIL=$((FAIL+1)); fi
if grep -q 'measure: { maxWidth: 720 }' "$SRC"; then echo "PASS  measure widened"; PASS=$((PASS+1)); else echo "FAIL  measure widened"; FAIL=$((FAIL+1)); fi

# --- rebuilt bundle assertions (Expo-web minifies styles to SINGLE-quoted strings) ---
if [ -n "$JS" ]; then echo "PASS  bundle exists"; PASS=$((PASS+1)); else echo "FAIL  bundle exists"; FAIL=$((FAIL+1)); fi
if [ -n "$JS" ] && grep -q "width:'60%'" "$JS"; then echo "PASS  bundle has 60% col"; PASS=$((PASS+1)); else echo "FAIL  bundle has 60% col"; FAIL=$((FAIL+1)); fi

# --- typecheck ---
( cd "$ROOT" && npx tsc --noEmit >/tmp/hermes-verify-tsc.log 2>&1 ); RC=$?
if [ "$RC" -eq 0 ]; then echo "PASS  tsc clean"; PASS=$((PASS+1)); else echo "FAIL  tsc clean"; FAIL=$((FAIL+1)); fi

echo "----"
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
