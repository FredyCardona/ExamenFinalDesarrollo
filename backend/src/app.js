import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import { Sequelize, DataTypes } from 'sequelize';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const carpetaActual = path.dirname(fileURLToPath(import.meta.url));
const archivoBD = path.resolve(carpetaActual, '../data/laboratorio.sqlite');

// La autorización se verifica aquí, nunca solo en React.
export function puedeCerrar(incidencia, usuario) {
  return usuario.rol === 'tecnico' || incidencia.usuarioId === usuario.id;
}

export async function crearServidor({ almacenamiento = archivoBD, secreto } = {}) {
  if (almacenamiento !== ':memory:') {
    fs.mkdirSync(path.dirname(almacenamiento), { recursive: true });
  }

  const db = new Sequelize({ dialect: 'sqlite', storage: almacenamiento, logging: false });

  const Usuario = db.define('Usuario', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    correo: { type: DataTypes.STRING, allowNull: false, unique: true },
    clave: { type: DataTypes.STRING, allowNull: false },
    rol: { type: DataTypes.ENUM('usuario', 'tecnico'), allowNull: false }
  });

  const Equipo = db.define('Equipo', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    ubicacion: { type: DataTypes.STRING, allowNull: false }
  });

  const Incidencia = db.define('Incidencia', {
    descripcion: { type: DataTypes.TEXT, allowNull: false },
    estado: { type: DataTypes.ENUM('abierta', 'cerrada'), defaultValue: 'abierta' }
  });

  Usuario.hasMany(Incidencia, { foreignKey: 'usuarioId' });
  Incidencia.belongsTo(Usuario, { foreignKey: 'usuarioId' });
  Equipo.hasMany(Incidencia, { foreignKey: 'equipoId' });
  Incidencia.belongsTo(Equipo, { foreignKey: 'equipoId' });

  await db.sync();

  // Datos de ejemplo para probar los dos roles.
  for (const persona of [
    { nombre: 'Ana', correo: 'usuario@lab.com', rol: 'usuario' },
    { nombre: 'Luis', correo: 'tecnico@lab.com', rol: 'tecnico' },
    { nombre: 'Mario', correo: 'usuario2@lab.com', rol: 'usuario' }
  ]) {
    const existe = await Usuario.findOne({ where: { correo: persona.correo } });
    if (!existe) {
      await Usuario.create({ ...persona, clave: await bcrypt.hash('123456', 10) });
    }
  }

  if ((await Equipo.count()) === 0) {
    await Equipo.bulkCreate([
      { nombre: 'Computadora 01', ubicacion: 'Laboratorio A' },
      { nombre: 'Computadora 02', ubicacion: 'Laboratorio A' },
      { nombre: 'Impresora 01', ubicacion: 'Laboratorio B' }
    ]);
  }

  const app = express();
  app.use(express.json());
  app.use(session({
    secret: secreto || process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 24 * 60 * 60 * 1000 }
  }));

  function requiereSesion(req, res, next) {
    if (!req.session.usuario) return res.status(401).json({ error: 'Debes iniciar sesión' });
    next();
  }

  app.post('/api/login', async (req, res, next) => {
    try {
      const { correo, clave } = req.body || {};
      const usuario = await Usuario.findOne({ where: { correo: String(correo || '').trim().toLowerCase() } });
      if (!usuario || !await bcrypt.compare(String(clave || ''), usuario.clave)) {
        return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
      }
      req.session.regenerate((error) => {
        if (error) return next(error);
        req.session.usuario = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
        res.json({ usuario: req.session.usuario });
      });
    } catch (error) { next(error); }
  });

  app.get('/api/sesion', requiereSesion, (req, res) => res.json({ usuario: req.session.usuario }));

  app.post('/api/logout', requiereSesion, (req, res, next) => {
    req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie('connect.sid');
      res.json({ mensaje: 'Sesión cerrada' });
    });
  });

  app.get('/api/equipos', requiereSesion, async (req, res, next) => {
    try { res.json(await Equipo.findAll({ order: [['id', 'ASC']] })); }
    catch (error) { next(error); }
  });

  app.get('/api/incidencias', requiereSesion, async (req, res, next) => {
    try {
      const incidencias = await Incidencia.findAll({
        include: [
          { model: Equipo, attributes: ['nombre'] },
          { model: Usuario, attributes: ['nombre'] }
        ],
        order: [['id', 'DESC']]
      });
      res.json(incidencias);
    } catch (error) { next(error); }
  });

  app.post('/api/incidencias', requiereSesion, async (req, res, next) => {
    try {
      const descripcion = String(req.body?.descripcion || '').trim();
      const equipoId = Number(req.body?.equipoId);
      if (!descripcion || !Number.isInteger(equipoId) || equipoId <= 0) {
        return res.status(400).json({ error: 'Selecciona un equipo y escribe una descripción' });
      }
      const equipo = await Equipo.findByPk(equipoId);
      if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });
      const incidencia = await Incidencia.create({ descripcion, equipoId, usuarioId: req.session.usuario.id });
      res.status(201).json(incidencia);
    } catch (error) { next(error); }
  });

  app.patch('/api/incidencias/:id/cerrar', requiereSesion, async (req, res, next) => {
    try {
      const incidencia = await Incidencia.findByPk(req.params.id);
      if (!incidencia) return res.status(404).json({ error: 'Incidencia no encontrada' });
      if (!puedeCerrar(incidencia, req.session.usuario)) {
        return res.status(403).json({ error: 'No tienes permiso para cerrar esta incidencia' });
      }
      if (incidencia.estado === 'cerrada') {
        return res.status(409).json({ error: 'La incidencia ya está cerrada' });
      }
      incidencia.estado = 'cerrada';
      await incidencia.save();
      res.json(incidencia);
    } catch (error) { next(error); }
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  });

  return { app, db };
}
