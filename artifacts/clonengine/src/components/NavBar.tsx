import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useSession, signOut } from "@workspace/api-client-react";
import { BiometricLoginModal } from "./BiometricLoginModal";

interface NavBarProps {
  onDownload?: () => void;
}

export function NavBar({ onDownload }: NavBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [bamOpen, setBamOpen] = useState(false);
  const [bamUser, setBamUser] = useState("");
  const [location, navigate] = useLocation();
  const { data: session } = useSession();

  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);

  const isActive = (path: string) =>
    path === "/" ? location === "/" : location.startsWith(path);

  return (
    <>
      <BiometricLoginModal
        open={bamOpen}
        onClose={() => setBamOpen(false)}
        onLogin={(u) => { setBamUser(u); if (u) setBamOpen(false); }}
      />
      <nav id="nav" className={scrolled ? "scrolled" : ""}>
        <div className="nav-in">
          <a href="/" className="nav-logo" onClick={e => { e.preventDefault(); navigate("/"); }}>
            <div className="nlive" />
            <span className="nlogo-zl">ZERO</span><span className="nlogo-lag">LAG</span>
            <span className="nlogo-tag">by KlonOS</span>
          </a>
          <ul className="nav-links">
            <li>
              <a
                href="/engineering"
                className={isActive("/engineering") ? "nav-tab-active" : ""}
                onClick={e => { e.preventDefault(); navigate("/engineering"); }}
              >Engineering</a>
            </li>
            <li>
              <a
                href="/apps"
                className={isActive("/apps") ? "nav-tab-active" : ""}
                onClick={e => { e.preventDefault(); navigate("/apps"); }}
              >Apps</a>
            </li>
            <li>
              <a
                href="/docs"
                className={isActive("/docs") ? "nav-tab-active" : ""}
                onClick={e => { e.preventDefault(); navigate("/docs"); }}
              >Docs</a>
            </li>
            <li>
              {location === "/" && <a href="#pricing">Pricing</a>}
            </li>
            <li>
              {session?.user ? (
                <button className="nav-login active" onClick={() => navigate("/dashboard")}>
                  ✓ Dashboard →
                </button>
              ) : (
                <button
                  className={`nav-login${bamUser ? " active" : ""}`}
                  onClick={() => setBamOpen(true)}
                >
                  {bamUser ? `✓ ${bamUser}` : "Login / Register"}
                </button>
              )}
            </li>
            {onDownload && (
              <li>
                <a href="#pricing" className="nav-cta" onClick={e => { e.preventDefault(); onDownload(); }}>
                  Kill my lag →
                </a>
              </li>
            )}
            {!onDownload && (
              <li>
                <a href="/" className="nav-cta" onClick={e => { e.preventDefault(); navigate("/"); }}>
                  Get ZeroLag →
                </a>
              </li>
            )}
          </ul>
        </div>
      </nav>
    </>
  );
}
