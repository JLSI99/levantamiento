from src.dependencies.security_template import ValidadorSeguridad

_seguridad = ValidadorSeguridad(
    nombre_servicio="ms-usuarios-y-autenticacion",
    db_dependency=None,            # No inyecta cont
    tipo_token_estricto="access"
)

validate_jwt_token = _seguridad.validate_jwt_token
require_capability = _seguridad.require_capability