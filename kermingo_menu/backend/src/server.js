import environments from './api/config/environments.js';
import app from './app.js';

app.listen(environments.port, () => {
  console.log(`Servidor Kermingo escuchando en puerto ${environments.port}`);
});
