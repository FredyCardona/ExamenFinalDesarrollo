import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearServidor, puedeCerrar } from '../src/app.js';

// Prueba la regla directamente y también con peticiones HTTP reales.
test('solo el dueño o un técnico puede cerrar', () => {
  const incidencia = { usuarioId: 1 };
  assert.equal(puedeCerrar(incidencia, { id: 1, rol: 'usuario' }), true);
  assert.equal(puedeCerrar(incidencia, { id: 2, rol: 'usuario' }), false);
  assert.equal(puedeCerrar(incidencia, { id: 2, rol: 'tecnico' }), true);
});

test('rutas: sesión, registro y cierre protegido', async () => {
  const { app, db } = await crearServidor({ almacenamiento: ':memory:', secreto: 'solo-para-la-prueba' });
  const servidor = await new Promise(resolve => {
    const instancia = app.listen(0, '127.0.0.1', () => resolve(instancia));
  });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  let cookie = '';

  async function solicitud(ruta, metodo = 'GET', cuerpo) {
    const res = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {})
    });
    if (res.headers.get('set-cookie')) cookie = res.headers.get('set-cookie').split(';')[0];
    return { status: res.status, datos: await res.json() };
  }

  try {
    assert.equal((await solicitud('/api/equipos')).status, 401);
    assert.equal((await solicitud('/api/login', 'POST', { correo: 'usuario@lab.com', clave: '123456' })).status, 200);
    const equipos = await solicitud('/api/equipos');
    assert.equal(equipos.status, 200);
    const nueva = await solicitud('/api/incidencias', 'POST', { equipoId: equipos.datos[0].id, descripcion: 'No enciende' });
    assert.equal(nueva.status, 201);
    const id = nueva.datos.id;

    await solicitud('/api/logout', 'POST');
    assert.equal((await solicitud('/api/login', 'POST', { correo: 'usuario2@lab.com', clave: '123456' })).status, 200);
    assert.equal((await solicitud(`/api/incidencias/${id}/cerrar`, 'PATCH')).status, 403);

    await solicitud('/api/logout', 'POST');
    assert.equal((await solicitud('/api/login', 'POST', { correo: 'tecnico@lab.com', clave: '123456' })).status, 200);
    assert.equal((await solicitud(`/api/incidencias/${id}/cerrar`, 'PATCH')).status, 200);
    assert.equal((await solicitud(`/api/incidencias/${id}/cerrar`, 'PATCH')).status, 409);
  } finally {
    await new Promise((resolve, reject) => servidor.close(error => error ? reject(error) : resolve()));
    await db.close();
  }
});
