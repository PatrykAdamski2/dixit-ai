#!/usr/bin/env bash
set -euo pipefail

ROLE_NAME="dixit_test"
ROLE_PASSWORD="dixit_test"
DB_NAME="dixit_ai_test"

run_as_postgres() {
  if command -v sudo >/dev/null 2>&1; then
    sudo -u postgres "$@"
  else
    su - postgres -c "${*}"
  fi
}

if ! run_as_postgres psql -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='${ROLE_NAME}'" | grep -q 1; then
  run_as_postgres psql -d postgres -v ON_ERROR_STOP=1 -c "CREATE ROLE ${ROLE_NAME} LOGIN PASSWORD '${ROLE_PASSWORD}';"
fi

if ! run_as_postgres psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  run_as_postgres psql -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ${ROLE_NAME};"
fi

psql "postgresql://${ROLE_NAME}:${ROLE_PASSWORD}@localhost:5432/${DB_NAME}" -v ON_ERROR_STOP=1 -c "SELECT current_database(), current_user;"

echo "✅ Test DB ready: postgresql://${ROLE_NAME}:${ROLE_PASSWORD}@localhost:5432/${DB_NAME}"
