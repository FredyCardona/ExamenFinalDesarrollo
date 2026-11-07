import React, { useEffect, useState } from 'react';

async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch(`/api${ruta}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opciones
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || 'Ocurrió un error');
  return datos;
}

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [correo, setCorreo] = useState('usuario@lab.com');
  const [clave, setClave] = useState('123456');
  const [equipos, setEquipos] = useState([]);
  const [incidencias, setIncidencias] = useState([]);
  const [equipoId, setEquipoId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  async function cargarDatos() {
    const [listaEquipos, listaIncidencias] = await Promise.all([
      pedir('/equipos'), pedir('/incidencias')
    ]);
    setEquipos(listaEquipos);
    setIncidencias(listaIncidencias);
    setEquipoId(actual => actual || String(listaEquipos[0]?.id || ''));
  }

  useEffect(() => {
    async function revisarSesion() {
      try {
        const datos = await pedir('/sesion');
        setUsuario(datos.usuario);
        await cargarDatos();
      } catch (e) {
        if (e.message !== 'Debes iniciar sesión') setError(e.message);
      } finally {
        setCargando(false);
      }
    }
    revisarSesion();
  }, []);

  async function entrar(evento) {
    evento.preventDefault();
    setError('');
    try {
      const datos = await pedir('/login', { method: 'POST', body: JSON.stringify({ correo, clave }) });
      setUsuario(datos.usuario);
      await cargarDatos();
    } catch (e) { setError(e.message); }
  }

  async function salir() {
    setError('');
    try {
      await pedir('/logout', { method: 'POST' });
      setUsuario(null);
      setEquipos([]);
      setIncidencias([]);
    } catch (e) { setError(e.message); }
  }

  async function registrar(evento) {
    evento.preventDefault();
    setError('');
    try {
      await pedir('/incidencias', {
        method: 'POST', body: JSON.stringify({ equipoId: Number(equipoId), descripcion })
      });
      setDescripcion('');
      await cargarDatos();
    } catch (e) { setError(e.message); }
  }

  async function cerrar(id) {
    setError('');
    try {
      await pedir(`/incidencias/${id}/cerrar`, { method: 'PATCH' });
      await cargarDatos();
    } catch (e) { setError(e.message); }
  }

  if (cargando) return <main><p>Cargando...</p></main>;

  return (
    <main>
      <h1>Incidencias del laboratorio</h1>
      {error && <p className="error" role="alert">{error}</p>}

      {!usuario ? (
        <section className="tarjeta inicio">
          <h2>Iniciar sesión</h2>
          <form onSubmit={entrar}>
            <label>Correo<input type="email" value={correo} onChange={e => setCorreo(e.target.value)} required /></label>
            <label>Contraseña<input type="password" value={clave} onChange={e => setClave(e.target.value)} required /></label>
            <button type="submit">Entrar</button>
          </form>
          <small>Prueba: usuario@lab.com o tecnico@lab.com · contraseña 123456</small>
        </section>
      ) : (
        <>
          <div className="barra">
            <span>Sesión: <strong>{usuario.nombre}</strong> ({usuario.rol})</span>
            <button className="secundario" onClick={salir}>Salir</button>
          </div>

          <section className="tarjeta">
            <h2>Registrar incidencia</h2>
            <form onSubmit={registrar}>
              <label>Equipo
                <select value={equipoId} onChange={e => setEquipoId(e.target.value)} required>
                  {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre} — {eq.ubicacion}</option>)}
                </select>
              </label>
              <label>Descripción
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} required rows="3" />
              </label>
              <button type="submit">Guardar incidencia</button>
            </form>
          </section>

          <section className="tarjeta">
            <h2>Incidencias registradas</h2>
            {incidencias.length === 0 ? <p>Todavía no hay incidencias.</p> : (
              <div className="tabla">
                <table>
                  <thead><tr><th>Equipo</th><th>Descripción</th><th>Registró</th><th>Estado</th><th>Acción</th></tr></thead>
                  <tbody>
                    {incidencias.map(i => (
                      <tr key={i.id}>
                        <td>{i.Equipo?.nombre}</td>
                        <td>{i.descripcion}</td>
                        <td>{i.Usuario?.nombre}</td>
                        <td>{i.estado}</td>
                        <td>
                          {i.estado === 'abierta' && (usuario.rol === 'tecnico' || i.usuarioId === usuario.id)
                            ? <button onClick={() => cerrar(i.id)}>Cerrar</button>
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
