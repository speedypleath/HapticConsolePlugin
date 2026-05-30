import { render } from 'preact';
import { setupBridge } from './bridge';
import { App } from './App';
import './style.css';

setupBridge();
render(<App />, document.getElementById('root')!);
