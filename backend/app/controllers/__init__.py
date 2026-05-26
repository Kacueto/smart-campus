"""Capa Controlador del patrón MVC.

Cada módulo expone un `router` (APIRouter) cuyos handlers orquestan:
modelos (acceso a datos), vistas (Pydantic schemas) y servicios auxiliares
(JWT, MQTT). No contienen SQL directo ni reglas de presentación de datos.
"""
