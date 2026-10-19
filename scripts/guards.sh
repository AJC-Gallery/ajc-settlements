#!/usr/bin/env bash
# Repository guards. Fails the build on the first group of violations found.
# Owned by the deployment owner (controlling agent). Do not edit from app chats.
set -u
cd "$(dirname "$0")/.."

fail=0
report() { echo "GUARD FAILED: $1"; shift; printf '  %s\n' "$@"; fail=1; }

src_dirs=$(ls -d apps/*/src packages/*/src 2>/dev/null || true)

# 1. S-13: nothing for reserved sectors may exist in iteration 1.
reserved='tenanc|money|payment|document|vault|pricing|billing|agent|client|import|invoice'
if [ -n "$src_dirs" ]; then
  hits=$(find $src_dirs -mindepth 1 -type d 2>/dev/null | grep -Ei "/($reserved)[a-z-]*(/|$)" || true)
  [ -n "$hits" ] && report "S-13 reserved-sector folder present" $hits
fi

# 2. P-13: no console.* in source.
if [ -n "$src_dirs" ]; then
  hits=$(grep -rEn --include='*.ts' --include='*.tsx' 'console\.(log|debug|info|warn|error)' $src_dirs 2>/dev/null || true)
  [ -n "$hits" ] && report "P-13 console usage" "$hits"
fi

# 3. Secrets and env files must not be tracked (only .env.example is allowed).
if git rev-parse --git-dir >/dev/null 2>&1; then
  hits=$(git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$' || true)
  [ -n "$hits" ] && report "env file tracked" $hits

  # 4. Build output must not be tracked.
  hits=$(git ls-files | grep -E '(^|/)(dist|dist-[a-z]+|build|\.next)/' || true)
  [ -n "$hits" ] && report "build output tracked" $hits

  # 5. Line endings: LF only in tracked text files.
  hits=$(git ls-files --eol | grep -E 'i/(crlf|mixed)' | awk '{print $NF}' || true)
  [ -n "$hits" ] && report "CRLF line endings in index" $hits
fi

# 6. Lockfile must exist.
[ -f pnpm-lock.yaml ] || report "pnpm-lock.yaml missing" "run pnpm install and commit the lockfile"

# 7. Other package managers must not be used.
hits=$(ls package-lock.json yarn.lock 2>/dev/null || true)
[ -n "$hits" ] && report "wrong package manager lockfile" $hits

if [ "$fail" -ne 0 ]; then exit 1; fi
echo "guards: ok"
