import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkCharacter, suggestCharacter } from './characterFiles.mjs';
import { validCharacterId } from './characterValidation.mjs';

/**
 * Только dev-сервер, для редактора рига (?rig=<id>) и листа поз (?sheet=<id>):
 * POST /__rig/check/<id> — проверить манифест из тела запроса, ответ { errors, warnings };
 * POST /__rig/hint/<id> — подсказка рига по картинкам бойца (tools/characterHints.mjs), ответ { art, notes } или 422 { error };
 * POST /__rig/<id> — проверить и, если ошибок нет, записать в src/game/characters/<id>.json.
 * Правила проверки — tools/characterValidation.mjs (те же, что в тесте).
 * @returns {import('vite').Plugin}
 */
export function saveRigPlugin() {
  return {
    name: 'save-character-rig',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__rig/', (req, res) => {
        const [, action, id] = /^\/(?:(check|hint)\/)?([^/?]*)$/.exec(req.url ?? '') ?? [];
        const reply = (status, body) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(body));
        };
        if (req.method !== 'POST' || !validCharacterId(id)) {
          reply(400, { errors: [{ code: 'request', path: 'id', message: 'Нужен POST /__rig/[check/|hint/]<id>, id из a–z, 0–9, _' }], warnings: [] });
          return;
        }
        if (action === 'hint') {
          const hint = suggestCharacter(server.config.root, id);
          reply(hint.error ? 422 : 200, hint);
          return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          let art;
          try {
            art = JSON.parse(body);
          } catch (e) {
            reply(400, { errors: [{ code: 'json', path: 'art', message: String(e) }], warnings: [] });
            return;
          }
          const result = checkCharacter(server.config.root, id, art);
          if (action === 'check') {
            reply(200, result);
            return;
          }
          if (result.errors.length) {
            reply(422, result);
            return;
          }
          writeFileSync(resolve(server.config.root, 'src/game/characters', `${id}.json`), JSON.stringify(art, null, 2) + '\n');
          reply(200, result);
        });
      });
    },
  };
}
