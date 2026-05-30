import { render } from 'preact';
import { setupBridge } from './bridge';
import { App } from './App';
import './style.css';

(async () => {
    await setupBridge();
    render(<App />, document.getElementById('root')!);
})();
