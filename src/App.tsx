import { signal } from '@preact/signals';
import { Flywheel }  from './components/Flywheel';
import { Joystick }  from './components/Joystick';
import { CCStrip }   from './components/CCStrip';
import { Settings }  from './components/Settings';
import { paramValues, isOnline } from './params';

const showSettings = signal(false);

export function App() {
    return (
        <div id="app">
            <header>
                <h1>Haptic Console</h1>
                <span>v1.0</span>
                <div id="midi-status">
                    <div id="midi-dot" class={isOnline.value ? 'active' : ''} />
                    <span>{isOnline.value ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
                <button
                    id="settings-btn"
                    class={showSettings.value ? 'active' : ''}
                    onClick={() => { showSettings.value = !showSettings.value; }}
                    title="Settings"
                >
                    ⚙
                </button>
            </header>

            {showSettings.value ? (
                <Settings />
            ) : (
                <>
                    <div id="modules">
                        <Flywheel
                            velocity={paramValues.flywheel_velocity}
                            direction={paramValues.flywheel_direction}
                        />
                        <Joystick
                            label="B — Joystick Left"
                            x={paramValues.joystick_1_x}
                            y={paramValues.joystick_1_y}
                        />
                        <Joystick
                            label="B — Joystick Right"
                            x={paramValues.joystick_2_x}
                            y={paramValues.joystick_2_y}
                        />
                    </div>
                    <CCStrip />
                </>
            )}
        </div>
    );
}
