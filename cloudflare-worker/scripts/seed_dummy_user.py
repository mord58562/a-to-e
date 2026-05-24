#!/usr/bin/env python3
"""Insert a user row directly into the D1 `users` table.

Writes a LEGACY-format row (PBKDF2-SHA256 hash + plaintext email).
That's fine - the worker migrates legacy rows to Argon2id + encrypted
email on the first successful login. This keeps the seeding tool
runnable without porting Argon2id to Python.

Usage:
    python3 scripts/seed_dummy_user.py <email> <password> [display_name] [admin|user]

Prints the wrangler one-liner; pipe through `sh` or copy-paste.
"""
import hashlib, secrets, sys, uuid, time, shlex

def hash_password(password: str, salt_hex: str) -> str:
    # The worker's hashPassword encodes the salt HEX as UTF-8 bytes (not the
    # raw bytes the hex represents). We mirror that here so the produced
    # hash will validate against /api/login.
    salt_bytes = salt_hex.encode("utf-8")
    pw_bytes   = password.encode("utf-8")
    return hashlib.pbkdf2_hmac("sha256", pw_bytes, salt_bytes, 100000, 32).hex()

def main():
    if len(sys.argv) < 3:
        sys.exit("usage: seed_dummy_user.py <email> <password> [display_name] [admin|user]")
    email = sys.argv[1].lower()
    password = sys.argv[2]
    display = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] not in ("admin","user") else email.split("@")[0]
    role_arg = sys.argv[-1] if sys.argv[-1] in ("admin","user") else "user"
    is_admin = 1 if role_arg == "admin" else 0

    uid = str(uuid.uuid4())
    salt = secrets.token_hex(16)
    pw_hash = hash_password(password, salt)
    now = int(time.time())

    sql = (
        "INSERT INTO users (id, email, password_hash, password_salt, "
        "display_name, is_admin, created_at) VALUES ("
        f"'{uid}', '{email}', '{pw_hash}', '{salt}', "
        f"{shlex.quote(display)}, {is_admin}, {now});"
    )
    cmd = f"wrangler d1 execute a-to-e --remote --command {shlex.quote(sql)}"
    print(cmd)

if __name__ == "__main__":
    main()
