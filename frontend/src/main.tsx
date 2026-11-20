import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {TranslationProvider} from './i18n/TranslationProvider.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <TranslationProvider>
    <App />
  </TranslationProvider>,
);
