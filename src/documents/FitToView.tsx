import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Box } from "@mui/material";

// Scales its content down, if needed, so the whole document is visible at
// once - a dialog showing an invoice or quotation without scrolling.
// "Needed" means the content is taller than the room left in the viewport
// (or wider than its container); it never scales up past 100%.
//
// `reserved` is the vertical space the surrounding dialog already uses
// (title, toolbar, padding), subtracted from the viewport height. It's a
// constant rather than measured, because a MUI dialog is mid-animation (and
// so mis-measures) when it first mounts.
//
// A scaled node can't be rasterized faithfully (html2canvas reads the
// scaled box) - so exporting wraps itself in runAtActualSize(), which
// briefly drops the scale. Printing does the same via the print rule below
// (a transformed ancestor would also re-anchor `position: fixed` print
// styles).

export interface FitToViewHandle {
  runAtActualSize: <T>(fn: () => Promise<T>) => Promise<T>;
}

const MIN_SCALE = 0.35;
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const FitToView = forwardRef<FitToViewHandle, { fit: boolean; reserved?: number; children: ReactNode }>(
  function FitToView({ fit, reserved = 190, children }, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [naturalHeight, setNaturalHeight] = useState(0);
    const [actualSize, setActualSize] = useState(false);

    const measure = useCallback(() => {
      const host = hostRef.current;
      const inner = innerRef.current;
      if (!host || !inner) return;
      // offsetHeight/offsetWidth ignore transforms, so this is the content's
      // natural size whatever scale is currently applied.
      const h = inner.offsetHeight;
      const w = inner.offsetWidth;
      if (!h || !w) return;
      const availH = window.innerHeight - reserved;
      setNaturalHeight(h);
      setScale(Math.max(MIN_SCALE, Math.min(1, availH / h, host.clientWidth / w)));
    }, [reserved]);

    useLayoutEffect(() => {
      measure();
    }, [measure, children]);

    useEffect(() => {
      const inner = innerRef.current;
      const observer = inner ? new ResizeObserver(measure) : null;
      if (inner) observer?.observe(inner);
      window.addEventListener("resize", measure);
      return () => {
        observer?.disconnect();
        window.removeEventListener("resize", measure);
      };
    }, [measure]);

    useImperativeHandle(ref, () => ({
      runAtActualSize: async (fn) => {
        setActualSize(true);
        await nextFrame();
        await nextFrame();
        try {
          return await fn();
        } finally {
          setActualSize(false);
        }
      },
    }));

    const applied = fit && !actualSize ? scale : 1;

    return (
      <Box
        ref={hostRef}
        sx={{ height: applied < 1 && naturalHeight ? naturalHeight * applied : "auto", overflow: "visible" }}
      >
        <Box
          ref={innerRef}
          className="fit-to-view-inner"
          sx={{
            transform: applied < 1 ? `scale(${applied})` : "none",
            transformOrigin: "top center",
            "@media print": { transform: "none !important" },
          }}
        >
          {children}
        </Box>
      </Box>
    );
  },
);

export default FitToView;
