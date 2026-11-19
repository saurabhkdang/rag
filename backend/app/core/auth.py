"""
Very simple admin login.
Token format:  "<expiry_timestamp>.<signature>"
The signature proves WE created the token (only we know SECRET_KEY),
so nobody can fake a token or change its expiry time.
"""
import hashlib
import hmac
import secrets
import time

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.settings import ADMIN_PASSWORD, SECRET_KEY, TOKEN_HOURS

# Reads the "Authorization: Bearer <token>" header
bearer_scheme = HTTPBearer(auto_error=False)

def _sign(text):
  return hmac.new(SECRET_KEY.encode(), text.encode(), hashlib.sha256).hexdigest()

def check_password(password):
  return secrets.compare_digest(password.encode(), ADMIN_PASSWORD.encode())

def create_token():
  expires = int(time.time()) + TOKEN_HOURS * 3600
  return f"{expires}.{_sign(str(expires))}"

def verify_token(token):
  try:
    expires_text, signature = token.split(".", 1)
    expires = int(expires_text)
  except ValueError:
    return False # badly formatted token

  if expires < time.time():
    return False #expired

  return secrets.compare_digest(signature, _sign(expires_text))

def require_admin(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
  """Use as a dependency on any endpoint that needs admin login"""
  if credentials is None or not verify_token(credentials.credentials):
    raise HTTPException(status_code=401, detail="Not logged in or session expired")