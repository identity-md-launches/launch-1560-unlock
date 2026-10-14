import { useEffect, useRef, useState } from "react";
import {
  Home,
  MyUnlock,
  Milestones,
  Activity,
  HowItWorks,
  Contracts,
} from "./pages";
import { Trade } from "./Trade";
import { ConnectButton } from "./wallet";
import { useData } from "./data";
import { Emblem, Notice } from "./components";
import { REPO } from "./config";
const navigation = [
  ["", "Experiment"],
  ["trade", "Trade"],
  ["unlock", "My Unlock"],
  ["milestones", "Milestones"],
  ["activity", "Holders & activity"],
  ["how", "How it works"],
  ["contracts", "Transparency"],
] as const;
export function App() {
  const [route, setRoute] = useState(
    location.hash.replace(/^#\/?/, "").split("?")[0],
  );
  const [menu, setMenu] = useState(false);
  const d = useData();
  const main = useRef<HTMLElement>(null);
  const changed = useRef(false);
  useEffect(() => {
    const onHash = () => {
      setRoute(location.hash.replace(/^#\/?/, "").split("?")[0]);
      setMenu(false);
      changed.current = true;
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    document.title = `${navigation.find(([key]) => key === route)?.[1] ?? "Experiment"} · UNLOCK`;
    window.scrollTo({ top: 0, behavior: "instant" });
    if (changed.current) main.current?.focus({ preventScroll: true });
  }, [route]);
  let page;
  switch (route) {
    case "trade":
      page = <Trade />;
      break;
    case "unlock":
      page = <MyUnlock />;
      break;
    case "milestones":
      page = <Milestones />;
      break;
    case "activity":
      page = <Activity />;
      break;
    case "how":
      page = <HowItWorks />;
      break;
    case "contracts":
      page = <Contracts />;
      break;
    default:
      page = <Home />;
  }
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus({ preventScroll: true });
        }}
      >
        Skip to content
      </a>
      <div className="testnet-banner">
        <span className="testnet-dot" aria-hidden="true" />
        Sepolia testnet - test assets, no real monetary value
      </div>
      <header className="site-header">
        <a className="brand" href="#/" aria-label="UNLOCK home">
          <Emblem />
          <span>UNLOCK</span>
        </a>
        <nav
          className={menu ? "main-nav is-open" : "main-nav"}
          aria-label="Primary navigation"
        >
          {navigation.map(([key, label]) => (
            <a
              href={`#/${key}`}
              key={key}
              aria-current={route === key ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <ConnectButton />
          <button
            className="menu-button icon-button"
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? (
              "×"
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 8h16M4 16h16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            )}
          </button>
        </div>
      </header>
      <main
        id="main"
        ref={main}
        tabIndex={-1}
        className={`site-main route-${route || "home"}`}
      >
        {d.error && (
          <Notice tone="warning">
            <strong>Live reads interrupted.</strong> {d.error}
            <button
              className="text-button"
              disabled={d.loading}
              onClick={d.refresh}
            >
              Retry connection
            </button>
          </Notice>
        )}
        {page}
      </main>
      <footer className="site-footer">
        <div>
          <a className="brand" href="#/">
            <Emblem />
            <span>UNLOCK</span>
          </a>
          <p>Diamond hands. Transparent rules.</p>
        </div>
        <div>
          <a href="#/contracts">Contracts & evidence ↗</a>
          <a href={REPO} target="_blank" rel="noreferrer">
            Source on GitHub ↗
          </a>
          <span>Launch 1560 · Sepolia only</span>
        </div>
        <p className="footer-note">
          Test assets, no real monetary value. No guaranteed price, milestone or
          return.
        </p>
      </footer>
    </>
  );
}
