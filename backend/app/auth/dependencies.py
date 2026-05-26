"""Dependencias FastAPI para autenticación y autorización por rol.

Se usan en los controllers vía `Depends(get_current_user)` o
`Depends(require_role(UserRole.docente))`.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.jwt_handler import verify_token
from app.views.auth_view import TokenData, UserRole

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """Extrae y valida el Bearer token del header Authorization. Lanza 401 si es inválido."""
    token = credentials.credentials
    payload = verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenData(
        user_id = payload["sub"],
        codigo  = payload["codigo"],
        role    = payload["role"],
        jti     = payload["jti"],
    )

def require_role(*roles: UserRole):
    """Factoría de dependencia que lanza 403 si el rol del usuario no está en la lista permitida."""
    def checker(current_user: TokenData = Depends(get_current_user)) -> TokenData:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para esta acción",
            )
        return current_user
    return checker
