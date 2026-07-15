from src.database import get_db
from src.dependencies.security_template import ValidadorSeguridad

_seguridad = ValidadorSeguridad(
    nombre_servicio="ms-resguardos",
    db_dependency=get_db,
    tipo_token_estricto="access"
)

validate_jwt_token = _seguridad.validate_jwt_token
require_capability = _seguridad.require_capability