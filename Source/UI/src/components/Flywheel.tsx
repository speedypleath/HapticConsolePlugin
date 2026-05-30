import { useEffect, useRef } from 'preact/hooks';
import type { Signal } from '@preact/signals';

interface Props {
    velocity:  Signal<number>;
    direction: Signal<number>;
}

const CIRC            = 2 * Math.PI * 76; // r=76 → ≈477
const MAX_RAD_PER_SEC = 10 * Math.PI;     // ~300 RPM

export function Flywheel({ velocity, direction }: Props) {
    const spokesRef = useRef<SVGGElement>(null);
    const velArcRef = useRef<SVGCircleElement>(null);

    // rAF loop — reads signals via .peek() to avoid triggering re-renders each frame
    useEffect(() => {
        let angle = 0;
        let last  = performance.now();
        let raf: number;

        function tick(now: number) {
            const dt   = now - last;
            last = now;
            const v    = velocity.peek();
            const d    = direction.peek();
            const sign = d > 0.5 ? 1 : d < 0.5 ? -1 : 0;

            angle += v * MAX_RAD_PER_SEC * sign * (dt / 1000);

            spokesRef.current?.setAttribute('transform', `rotate(${angle * 180 / Math.PI})`);

            if (velArcRef.current) {
                const arcLen = v * CIRC;
                velArcRef.current.setAttribute('stroke-dasharray', `${arcLen} ${CIRC - arcLen}`);
                velArcRef.current.setAttribute('stroke-opacity', String(0.15 + v * 0.85));
            }

            raf = requestAnimationFrame(tick);
        }

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const velText = velocity.value.toFixed(3);
    const dirText = direction.value > 0.5 ? 'CW' : direction.value < 0.5 ? 'CCW' : '—';

    return (
        <div class="module">
            <div class="module-label">A — Kinetic Flywheel</div>
            <div class="flywheel-wrap">
                <svg width="160" height="160" viewBox="-80 -80 160 160">
                    <circle r="76" fill="none" stroke="#2a2a2a" stroke-width="3"/>
                    <g ref={spokesRef}>
                        <line x1="0" y1="-70" x2="0" y2="-10" stroke="#c8a84b" stroke-width="2" opacity="0.7"/>
                        <line x1="0" y1="-70" x2="0" y2="-10" stroke="#c8a84b" stroke-width="2" opacity="0.7" transform="rotate(60)"/>
                        <line x1="0" y1="-70" x2="0" y2="-10" stroke="#c8a84b" stroke-width="2" opacity="0.7" transform="rotate(120)"/>
                        <line x1="0" y1="-70" x2="0" y2="-10" stroke="#c8a84b" stroke-width="2" opacity="0.7" transform="rotate(180)"/>
                        <line x1="0" y1="-70" x2="0" y2="-10" stroke="#c8a84b" stroke-width="2" opacity="0.7" transform="rotate(240)"/>
                        <line x1="0" y1="-70" x2="0" y2="-10" stroke="#c8a84b" stroke-width="2" opacity="0.7" transform="rotate(300)"/>
                        <circle r="70" fill="none" stroke="#c8a84b" stroke-width="6" opacity="0.5"/>
                        <circle r="10" fill="#1a1a1a" stroke="#c8a84b" stroke-width="2"/>
                    </g>
                    <circle
                        ref={velArcRef}
                        r="76" fill="none"
                        stroke="#c8a84b" stroke-width="3" stroke-opacity="0.15"
                        stroke-dasharray={`0 ${CIRC}`} stroke-dashoffset="119"
                        transform="rotate(-90)"
                    />
                </svg>
            </div>
            <div class="fw-stats">
                <div class="stat">
                    <div class="stat-label">Velocity</div>
                    <div class="stat-value">{velText}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Direction</div>
                    <div class="stat-value">{dirText}</div>
                </div>
            </div>
        </div>
    );
}
