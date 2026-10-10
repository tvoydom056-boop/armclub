import '@fontsource/rubik/latin-700.css';
import '@fontsource/rubik/cyrillic-700.css';
import '@fontsource/rubik/latin-900.css';
import '@fontsource/rubik/cyrillic-900.css';
import '@fontsource/russo-one/latin-400.css';
import '@fontsource/russo-one/cyrillic-400.css';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useGame } from './store/game';
import './styles.css';

// Dev: http://localhost:5173/?reset — начать игру с нуля.
const url = new URL(location.href);
if (import.meta.env.DEV && url.searchParams.has('reset')) {
  useGame.getState().resetSave();
  url.searchParams.delete('reset');
  history.replaceState(null, '', url);
}

createRoot(document.getElementById('root')!).render(<App />);
