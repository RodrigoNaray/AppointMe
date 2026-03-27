# Frontend testing structure

Esta carpeta centraliza todos los tests del frontend.

## Estructura
- tests/unit: utilidades, stores y logica aislada.
- tests/components: tests de componentes React.
- tests/integration: pruebas de flujos entre paginas/componentes.
- tests/fixtures: datos y mocks compartidos.
- tests/setup.ts: setup global de Vitest + Testing Library.

## Convenciones
- Nombres de archivo: *.test.tsx para React y *.test.ts para utilidades.
- Unit test: tests/unit/<scope>/<archivo>.test.ts
- Component test: tests/components/<Componente>.test.tsx
- Integration test: tests/integration/<flujo>.test.tsx

## Reglas
- El codigo productivo vive en src/
- Los tests nunca van en src/
- Coverage apunta a src/, no a tests/
