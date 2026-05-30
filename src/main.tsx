import { render } from 'preact';
import { setupBridge } from './bridge';
import { App } from './App';
import './style.css';

render(<App />, document.getElementById('root')!);
setupBridge().catch(console.error);
