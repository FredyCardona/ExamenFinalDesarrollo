# Registro de incidencias del laboratorio

Proyecto sencillo de Desarrollo Web: Node.js, Express, Sequelize con SQLite, React y cookies de sesión.

## Requisitos
- Node.js 20 o superior y npm.
- No necesitas instalar PostgreSQL: se utiliza SQLite, que es una base de datos local.

## Iniciar el backend
Abrir una terminal dentro de la carpeta `backend`:

```bash
npm install
npm test
npm start
```

El backend estará en http://localhost:3001. Si `npm test` termina con todas las pruebas aprobadas, la regla principal está comprobada.

## Iniciar el frontend
Abrir **otra terminal** dentro de la carpeta `frontend`:

```bash
npm install
npm run dev
```

Abrir http://localhost:5173 en el navegador.

## Usuarios de prueba

| Correo | Contraseña | Rol |
|---|---|---|
| usuario@lab.com | 123456 | usuario |
| usuario2@lab.com | 123456 | usuario |
| tecnico@lab.com | 123456 | tecnico |

Estas claves son solo para práctica local. Para uso real deben reemplazarse, y hay que configurar HTTPS y un almacén persistente de sesiones.

## ¿Cómo probar la regla?
1. Entra como `usuario@lab.com`, crea una incidencia y sal.
2. Entra como `usuario2@lab.com`: puedes ver la incidencia, **pero no cerrarla**.
3. Entra como `tecnico@lab.com`: ahora sí puedes cerrarla.
4. También se comprueba en el backend con `npm test` que intentar cerrar una incidencia de otra persona devuelve HTTP `403`.

## Tablas de base de datos
- `Usuarios`: nombre, correo, clave (hash), rol.
- `Equipos`: nombre, ubicacion.
- `Incidencias`: equipoId, usuarioId, descripcion, estado.

## Rutas
- `POST /api/login`: inicia sesión.
- `GET /api/sesion`: devuelve usuario y rol de la sesión.
- `POST /api/logout`: cierra sesión.
- `GET /api/equipos`: lista equipos.
- `GET /api/incidencias`: lista incidencias.
- `POST /api/incidencias`: registra incidencia.
- `PATCH /api/incidencias/:id/cerrar`: verifica permiso y cierra incidencia.

## Dos commits para la entrega
Ejecutar los comandos **desde la carpeta principal**, luego de extraer el ZIP:

```bash
git init
git branch -M main
git add .gitignore README.md backend decisiones.md prompts.md respuestas_serie_I.md
git commit -m "feat: backend con Sequelize y sesiones"
git add frontend
git commit -m "feat: frontend React para incidencias"
```

Si ya estás dentro de tu repositorio de tareas, **no hagas `git init`**: mueve la carpeta del proyecto dentro de ese repositorio, entra a la raíz del repositorio y ejecuta `git add` sobre la ruta de esta práctica. Usa `git push origin main` después de los commits.

Antes de entregar: captura la pantalla del login, una incidencia creada, la incidencia cerrada con técnico y la salida de `npm test`.
