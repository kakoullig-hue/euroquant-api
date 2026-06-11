#!/usr/bin/env python3
"""
Ops helper: hash a plaintext API key for use in EUROQUANT_API_KEYS.

Usage:
    python scripts/hash_key.py <plaintext-key>

Then add the printed hash to EUROQUANT_API_KEYS in api/.env:
    EUROQUANT_API_KEYS=<hash1>,<hash2>

Generate a random key first if needed:
    python -c "import secrets; print(secrets.token_urlsafe(32))"
"""
import sys

try:
    import bcrypt
except ImportError:
    print("Error: bcrypt not installed. Run: pip install bcrypt>=4.0.0", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    plaintext = sys.argv[1].strip()
    if not plaintext:
        print("Error: key cannot be empty.", file=sys.stderr)
        sys.exit(1)

    hashed = bcrypt.hashpw(plaintext.encode(), bcrypt.gensalt()).decode()
    print(hashed)


if __name__ == "__main__":
    main()
