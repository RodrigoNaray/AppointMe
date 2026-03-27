# Backend testing structure

Esta carpeta centraliza todos los tests del backend.

## Estructura
- tests/unit: pruebas de unidades puras (services, utils, helpers).
- tests/integration: pruebas de integracion (routes HTTP, flujo entre modulos).
- tests/fixtures: datos reutilizables para tests.

## Convenciones
- Nombres de archivo: *.test.ts
- Unit test de modulo: tests/unit/modules/<modulo>/<archivo>.test.ts
- Integration test de rutas: tests/integration/modules/<modulo>/<archivo>.test.ts

## Reglas
- El codigo productivo vive en src/
- Los tests nunca van en src/
- Coverage apunta a src/, no a tests/
