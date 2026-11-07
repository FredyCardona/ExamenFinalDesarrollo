# Decisiones del proyecto

## a) Qué entendí del problema y qué modelos planeé

Se necesita una aplicación para registrar problemas en los equipos de un laboratorio. Los usuarios inician sesión, ven los equipos y crean incidencias. Solamente quien registró una incidencia o un técnico puede cerrarla.

Planeé tres modelos con Sequelize:
- **Usuario:** nombre, correo, contraseña protegida y rol (`usuario` o `tecnico`).
- **Equipo:** nombre y ubicación.
- **Incidencia:** descripción, estado, usuario que la creó y equipo relacionado.

Elegí SQLite porque permite probar el examen sin instalar un servidor de base de datos aparte.

## b) Qué partes delegué a IA y por qué

Utilicé ayuda de IA para proponer una estructura simple de carpetas, escribir una primera versión de las rutas, los modelos de Sequelize y el formulario React. La usé para avanzar más rápido; después revisé la regla de permisos y ejecuté las pruebas del backend.

## c) Qué tuve que revisar o corregir y cómo lo comprobé

Un punto delicado fue **no depender del botón del frontend para controlar quién cierra**. Ocultar el botón no basta, porque cualquiera puede enviar una petición HTTP directamente. La solución fue comprobar en la ruta `PATCH /api/incidencias/:id/cerrar` que el usuario de la sesión sea el creador o tenga rol técnico. La prueba automática intenta cerrar una incidencia con otro usuario y espera el error **403**.

**Corrección concreta durante la revisión:** en la primera propuesta de la prueba HTTP se intentaba consultar `servidor.address().port` justo después de llamar a `listen()`. Eso podía ocurrir antes de que el servidor terminara de abrir el puerto. Lo corregí haciendo que la prueba espere a que `listen()` llame a su función de confirmación. Lo detecté al revisar cómo se inicia el servidor en Node.js.

**Pendiente:** al ejecutar el proyecto en mi computadora, completaré esta sección con el resultado real de `npm test` y cualquier problema adicional que encuentre.
