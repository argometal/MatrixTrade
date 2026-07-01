# Documentos — Health Vault

Aquí **el usuario mete las cosas**: quejas, correos pegados, cronologías, declaraciones de testigos, notas de otras IAs.

Esta carpeta es la **fuente de verdad** del contenido laboral. La app en `app/` es opcional.

---

## Cómo agregar un documento

1. Crea un archivo `.md` en esta carpeta (o subcarpeta por tema/año).
2. Nombra claro: `2025-03-15-asignacion-fuera-horario.md`
3. Incluye siempre que puedas:
   - **Fecha** del hecho
   - **Personas** involucradas
   - **Hecho** (qué pasó)
   - **Evidencia** (correo completo, mensaje, testigo)
   - **Estado** (abierto / documentado / resuelto / escalado)

4. Commitea en la rama `cursor/health-vault-dbc8`.

---

## Plantilla sugerida

```markdown
# Título del incidente o queja

- **Fecha:** YYYY-MM-DD
- **Tipo:** queja | incidente | comportamiento | correspondencia
- **Personas:** nombre, rol
- **Estado:** abierto

## Qué pasó

...

## Evidencia

### Correo / mensaje (texto completo)

...

## Notas

...
```

---

## Índice de documentos

| Archivo | Descripción |
|---------|-------------|
| [historial-ia.md](historial-ia.md) | Resumen de lo que hicieron las IAs en este proyecto |

*(Agrega filas aquí cuando crees nuevos archivos.)*

---

## Para IAs

Al entrar a Health Vault:

1. Lee `../CONTEXTO-IA.md`
2. Lee **todos** los `.md` de esta carpeta
3. Actualiza este índice si creas o renombras archivos
4. No borres contenido del usuario sin permiso
