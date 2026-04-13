// ─── Layer 5: UI Atoms — BenchBar · Counter · Rv ─────────────────────────────
import { useEffect, useRef, useState } from "react";

// Animated benchmark bar — triggers on scroll intersection
export function BenchBar({ w, color }: { w: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setWidth(w); ob.disconnect(); } },
      { threshold: .5 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [w]);
  return (
    <div ref={ref} className="bbw">
      <div className="bb" style={{ width: `${width}%`, background: color, transition: "width 1.4s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

// Animated counter — ease-in-out from 0 to target on scroll
export function Counter({ target, suffix, dec = 0 }: { target: number; suffix: string; dec?: number }) {
  const ref  = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ob = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        const dur = 1500, s = performance.now();
        function f(n: number) {
          if (!el) return;
          const p = Math.min((n - s) / dur, 1);
          const v = target * (p < .5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p));
          el.textContent = v.toFixed(dec) + suffix;
          if (p < 1) requestAnimationFrame(f);
        }
        requestAnimationFrame(f);
        ob.disconnect();
      }
    }, { threshold: .5 });
    ob.observe(el);
    return () => ob.disconnect();
  }, [target, suffix, dec]);
  return <span ref={ref}>0{suffix}</span>;
}

// Reveal wrapper — adds "vis" class when element enters viewport
export function Rv({ children, cls = "", style }: { children: React.ReactNode; cls?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("vis"); ob.disconnect(); } },
      { threshold: .12, rootMargin: "0px 0px -40px 0px" }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return <div ref={ref} className={`rv ${cls}`} style={style}>{children}</div>;
}
