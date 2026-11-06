import { useEffect, useId, useRef } from "react";
import { Box } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import { basics, palette } from "../../theme/tokens";

const hover = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

const shadowPulse = keyframes`
  0%, 100% { transform: scaleX(1); opacity: 0.28; }
  50% { transform: scaleX(0.78); opacity: 0.16; }
`;

const blink = keyframes`
  0%, 94%, 100% { transform: scaleY(1); }
  97% { transform: scaleY(0.1); }
`;

const antennaGlow = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
`;

const MAX_TILT_DEGREES = 16;

// Zybran, a little robot drawn in code, so it costs no 3D library on every page. It hovers,
// blinks, and turns to look at the pointer, which is what gives it its depth.
export default function Robot({ size = 72, still = false }: { size?: number; still?: boolean }) {
  const id = useId();
  const tiltRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (still || window.matchMedia("(prefers-reduced-motion: reduce), (hover: none)").matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = tiltRef.current?.getBoundingClientRect();
        if (!box) return;
        const reach = Math.max(window.innerWidth, window.innerHeight) / 2;
        const clamp = (value: number) => Math.max(-1, Math.min(1, value));
        const x = clamp((event.clientX - (box.left + box.width / 2)) / reach);
        const y = clamp((event.clientY - (box.top + box.height / 2)) / reach);
        tiltRef.current?.style.setProperty("--robot-x", x.toFixed(3));
        tiltRef.current?.style.setProperty("--robot-y", y.toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [still]);

  const motion = (animation: string) => (still ? {} : { animation, "@media (prefers-reduced-motion: reduce)": { animation: "none" } });

  return (
    <Box sx={{ width: size, height: size * 1.1, position: "relative", perspective: `${size * 4}px` }} aria-hidden>
      <Box sx={{ width: "100%", height: "100%", ...motion(`${hover} 3.2s ease-in-out infinite`) }}>
        <Box
          ref={tiltRef}
          sx={{
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transition: "transform 0.15s ease-out",
            transform: `rotateY(calc(var(--robot-x, 0) * ${MAX_TILT_DEGREES}deg)) rotateX(calc(var(--robot-y, 0) * ${-MAX_TILT_DEGREES}deg))`,
          }}
        >
          <svg viewBox="0 0 120 124" width="100%" height="100%" role="presentation" style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id={`${id}-shell`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={basics.white} />
                <stop offset="0.55" stopColor={palette.slate[100]} />
                <stop offset="1" stopColor={palette.slate[300]} />
              </linearGradient>
              <linearGradient id={`${id}-accent`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={palette.blue[500]} />
                <stop offset="1" stopColor={palette.blue[900]} />
              </linearGradient>
              <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={palette.blue[900]} />
                <stop offset="1" stopColor={palette.slate[900]} />
              </linearGradient>
              <radialGradient id={`${id}-glow`}>
                <stop offset="0" stopColor={palette.cyan[300]} />
                <stop offset="1" stopColor={palette.cyan[500]} />
              </radialGradient>
            </defs>

            {/* Arms and body sit behind the head */}
            <rect x="14" y="74" width="12" height="28" rx="6" fill={`url(#${id}-accent)`} />
            <rect x="94" y="74" width="12" height="28" rx="6" fill={`url(#${id}-accent)`} />
            <rect x="28" y="68" width="64" height="44" rx="20" fill={`url(#${id}-shell)`} />
            <circle cx="60" cy="90" r="9" fill={`url(#${id}-accent)`} />
            <path d="M56 90h8M60 86v8" stroke={basics.white} strokeWidth="2.4" strokeLinecap="round" />

            {/* Antenna */}
            <path d="M60 22V10" stroke={palette.slate[400]} strokeWidth="3.5" strokeLinecap="round" />
            <Box
              component="circle"
              cx="60"
              cy="8"
              r="6"
              fill={`url(#${id}-glow)`}
              sx={motion(`${antennaGlow} 2s ease-in-out infinite`)}
            />

            {/* Head */}
            <rect x="8" y="34" width="10" height="22" rx="5" fill={`url(#${id}-accent)`} />
            <rect x="102" y="34" width="10" height="22" rx="5" fill={`url(#${id}-accent)`} />
            <rect x="16" y="20" width="88" height="56" rx="24" fill={`url(#${id}-shell)`} />
            <rect x="25" y="29" width="70" height="38" rx="17" fill={`url(#${id}-screen)`} />
            {/* The screen's sheen stays put while the eyes look around behind it */}
            <path d="M33 37c8-4 22-5 32-4" stroke={basics.white} strokeOpacity="0.22" strokeWidth="3" strokeLinecap="round" fill="none" />

            <g style={{ transform: "translate(calc(var(--robot-x, 0) * 7px), calc(var(--robot-y, 0) * 4px))" }}>
              <Box
                component="g"
                sx={{ transformBox: "fill-box", transformOrigin: "center", ...motion(`${blink} 4.6s ease-in-out infinite`) }}
              >
                <circle cx="45" cy="47" r="6.5" fill={`url(#${id}-glow)`} />
                <circle cx="75" cy="47" r="6.5" fill={`url(#${id}-glow)`} />
              </Box>
              <path d="M52 57c4 4 12 4 16 0" stroke={palette.cyan[300]} strokeWidth="3" strokeLinecap="round" fill="none" />
            </g>
          </svg>
        </Box>
      </Box>
      {!still && (
        <Box
          sx={{
            position: "absolute",
            left: "22%",
            right: "22%",
            bottom: -4,
            height: size * 0.09,
            borderRadius: "50%",
            bgcolor: palette.blue[900],
            opacity: 0.22,
            filter: "blur(3px)",
            ...motion(`${shadowPulse} 3.2s ease-in-out infinite`),
          }}
        />
      )}
    </Box>
  );
}
