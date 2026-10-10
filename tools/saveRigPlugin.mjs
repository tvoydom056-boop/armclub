import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Только dev-сервер: редактор рига (?rig=<id>) сохраняет манифест POST-запросом /__rig/<id>
 * прямо в src/game/characters/<id>.json.
 * @returns {import('vite').Plugin}
 */
export function saveRigPlugin() {
  return {
    name: 'save-character-rig',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__rig/', (req, res) => {
        const id = (req.url ?? '').replace(/^\//, '');
        if (req.method !== 'POST' || !/^[a-z0-9_]+$/.test(id)) {
          res.statusCode = 400;
          res.end('bad request');
          return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const json = JSON.stringify(JSON.parse(body), null, 2) + '\n';
            writeFileSync(resolve(server.config.root, 'src/game/characters', `${id}.json`), json);
            res.end('ok');
          } catch (e) {
            res.statusCode = 400;
            res.end(String(e));
          }
        });
      });
    },
  };
}
