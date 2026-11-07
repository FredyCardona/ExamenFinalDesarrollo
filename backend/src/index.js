import { crearServidor } from './app.js';

const { app } = await crearServidor();
const puerto = Number(process.env.PORT || 3001);
app.listen(puerto, () => console.log(`Servidor en http://localhost:${puerto}`));
