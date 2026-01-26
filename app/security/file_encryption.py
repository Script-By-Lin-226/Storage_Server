"""
File content encryption at rest using Fernet (symmetric AES).
When enabled, uploads are encrypted before being written to disk and
decrypted when streaming downloads. Existing unencrypted files remain readable.
"""
import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

# Magic header written at the start of encrypted files (8 bytes)
_ENCRYPTED_HEADER = b"STORENC1"

logger = logging.getLogger(__name__)


def _get_fernet(key_value: str):
    """Return a Fernet instance from a base64url-encoded 32-byte key."""
    key = key_value.strip().encode("utf-8") if isinstance(key_value, str) else key_value
    return Fernet(key)


def encrypt_bytes(key_value: str, plain: bytes) -> bytes:
    """Encrypt plain bytes. Returns header + ciphertext."""
    if not key_value or not plain:
        return plain
    try:
        f = _get_fernet(key_value)
        ct = f.encrypt(plain)
        return _ENCRYPTED_HEADER + ct
    except Exception as e:
        logger.exception("Encryption failed: %s", e)
        raise


def decrypt_bytes(key_value: str, data: bytes) -> bytes:
    """
    Decrypt bytes. If data starts with the encrypted header, decrypt and return plaintext.
    Otherwise return data unchanged (legacy unencrypted file).
    """
    if not key_value or not data:
        return data
    if not data.startswith(_ENCRYPTED_HEADER):
        return data
    try:
        f = _get_fernet(key_value)
        return f.decrypt(data[len(_ENCRYPTED_HEADER) :])
    except InvalidToken as e:
        logger.warning("Decryption failed (invalid key or corrupted data): %s", e)
        raise
    except Exception as e:
        logger.exception("Decryption failed: %s", e)
        raise


def is_encryption_available(key_value: Optional[str]) -> bool:
    """Return True if encryption is configured and usable."""
    if not key_value or not key_value.strip():
        return False
    try:
        Fernet(key_value.strip().encode("utf-8"))
        return True
    except Exception:
        return False
