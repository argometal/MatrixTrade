TBCompanion — empaquetado para entrega
========================================

Qué incluir en el paquete (carpeta o ZIP)
-----------------------------------------
- server.js
- tbc.config.json  (ajustar macros/rutas en la máquina destino)
- public\          (UI estática)
- lib\             (validación, DB, etc.)
- start.bat
- start-hidden.vbs
- runtime\node\    (opcional pero recomendado: Node portable para Windows x64)
- data\            (opcional: si existe tbc.db; puede empezar vacío y crearse al arrancar)

Qué suele excluirse del ZIP de entrega
---------------------------------------
- .git\  (si el origen es un clon)
- Archivos personales de desarrollo (.docx de borrador, copias, etc.)
- Carpetas temporales de desempaquetado (_edit_docx, _verify_docx, …)

Cómo generar un ZIP listo para entrega (PowerShell)
---------------------------------------------------
Desde la raíz del repo:

  powershell -ExecutionPolicy Bypass -File .\scripts\zip-delivery.ps1

Salida: dist\TBCompanion-delivery.zip

Nota: el ZIP incluye runtime\node\ si existe; puede ser grande (~decenas de MB).
Si el destino ya tiene Node instalado, puedes borrar runtime del ZIP manualmente y usar start.bat con node en PATH.

Archivos opcionales
-------------------
- Carpeta **delivery\reference\**: plantillas Word u otras notas para entrega; TBC no las usa en ejecución.

Git (historial)
---------------
- En este repo el historial ya tiene **pocos commits** (no hace falta recortar a 10).
- Si en el futuro el historial crece y quieres **solo los últimos N commits** en una rama limpia, haz backup de la rama (`git branch backup/main`) y usa un squash interactivo o `git rebase` con ayuda de documentación oficial (operación destructiva; no conviene en repos ya compartidos sin coordinar).
- Tras limpiar archivos: `git gc --prune=now` libera objetos huérfanos locales.

Instalación rápida en otra PC
------------------------------
1) Descomprimir el ZIP en una carpeta fija (ej. C:\Tools\TBCompanion).
2) Editar tbc.config.json → macros (STARTUP_TOOLS, WELL_ROOT, …).
3) Arrancar con start-hidden.vbs (sin consola) o start.bat (con consola).
   Con start-hidden.vbs, tras unos segundos se abre solo el navegador en http://127.0.0.1:<puerto>/
   El puerto sale de TBC_PORT (variable de entorno) o del campo "port" en tbc.config.json (por defecto 4010).

Notas
-----
- Si el navegador abre antes de que el servidor termine de arrancar, recarga la página (F5).
- Para cambiar el puerto sin editar JSON: variable de entorno del sistema o de usuario TBC_PORT=4020
