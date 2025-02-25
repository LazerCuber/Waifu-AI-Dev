import { render } from 'preact';
import { App } from './app/App';
import { Provider } from 'jotai';
import './styles/globals.css';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Root element not found');
}

render(
  <Provider>
    <App />
  </Provider>,
  root
);