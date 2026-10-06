"""
Module Owner: Krishna Patel (24000131) — Database & GUI

Loads database configuration from a gitignored .env and decides which backend
to use:
  - Supabase (Postgres) when a connection string is present — shared cloud DB,
    so students register once and all three teammates see the same data.
  - Local SQLite otherwise — zero-config fallback for development.

Expected .env keys (see .env.example):
  PROJECT_URL          = https://<project>.supabase.co   (informational)
  Database_connection  = postgresql://postgres:<pwd>@db.<project>.supabase.co:5432/postgres
"""

import os

from dotenv import load_dotenv

load_dotenv()


def supabase_dsn() -> str | None:
    """Return the Postgres connection string if configured, else None.
    Accepts a few key spellings so a teammate's .env still works."""
    for key in ("Database_connection", "DATABASE_CONNECTION", "DATABASE_URL", "SUPABASE_DB_URL"):
        value = os.environ.get(key)
        if value and value.strip():
            return value.strip()
    return None


def using_supabase() -> bool:
    return supabase_dsn() is not None
