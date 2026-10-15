
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const ConstructionScene = () => (
  <div className="construction-scene relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#10101c]">
    <style>{`
      @keyframes floatAI {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-9px); }
      }

      @keyframes blinkLight {
        0%, 100% { opacity: .35; }
        50% { opacity: 1; }
      }

      @keyframes excavatorArm {
        0%, 100% { transform: rotate(-3deg); }
        50% { transform: rotate(5deg); }
      }

      @keyframes roadBuild {
        0%, 100% { opacity: .45; }
        50% { opacity: 1; }
      }

      @keyframes scanLine {
        0% { transform: translateY(-120px); }
        100% { transform: translateY(260px); }
      }

      @keyframes wheelTurn {
        to { transform: rotate(360deg); }
      }

      @keyframes workerBob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-2px); }
      }

      .ai-float { animation: floatAI 3s ease-in-out infinite; }
      .ai-float-delayed { animation: floatAI 3s ease-in-out 1s infinite; }
      .construction-light { animation: blinkLight 1.5s ease-in-out infinite; }
      .excavator-arm { transform-box: fill-box; transform-origin: 15% 90%; animation: excavatorArm 3s ease-in-out infinite; }
      .road-build { animation: roadBuild 2s ease-in-out infinite; }
      .scan-line { animation: scanLine 4s linear infinite; }
      .wheel { transform-box: fill-box; transform-origin: center; animation: wheelTurn 2s linear infinite; }
      .worker-bob { animation: workerBob 1.8s ease-in-out infinite; }

      @media (prefers-reduced-motion: reduce) {
        .ai-float, .ai-float-delayed, .construction-light,
        .excavator-arm, .road-build, .scan-line,
        .wheel, .worker-bob {
          animation: none !important;
        }
      }
    `}</style>

    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(109,40,217,0.22),transparent_65%)]" />

    {/* Stars and technical grid */}
    <svg
      viewBox="0 0 720 440"
      className="relative block h-auto w-full"
      role="img"
      aria-label="Animated illustration of an engineer and construction equipment building a road toward an AI connection"
    >
      <defs>
        <linearGradient id="roadSurface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#42445b" />
          <stop offset="100%" stopColor="#171824" />
        </linearGradient>
        <linearGradient id="aiGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="#a78bfa" strokeOpacity=".09" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="720" height="440" fill="url(#grid)" />

      {/* Distant AI destination */}
      <g className="ai-float">
        <circle cx="550" cy="91" r="49" fill="#8b5cf6" opacity=".07" />
        <circle cx="550" cy="91" r="35" fill="none" stroke="#a78bfa" strokeOpacity=".45" strokeDasharray="4 6" />
        <circle cx="550" cy="91" r="24" fill="#6d28d9" fillOpacity=".25" stroke="#a78bfa" strokeWidth="1.5" />
        <path d="M539 82Q550 71 561 82V99Q550 110 539 99Z" fill="none" stroke="#ddd6fe" strokeWidth="2" />
        <circle cx="544" cy="88" r="2" fill="#fff" />
        <circle cx="556" cy="88" r="2" fill="#fff" />
        <path d="M543 96H557M550 76V71" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round" />
        <text x="550" y="145" textAnchor="middle" fill="#c4b5fd" fontSize="11" letterSpacing="3">AI DESTINATION</text>
      </g>

      {/* Connection signals */}
      <g fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="5 7" opacity=".65">
        <path d="M520 137L466 178L430 211" />
        <path d="M574 134L606 170L614 198" />
      </g>
      <circle className="construction-light" cx="466" cy="178" r="3" fill="#c4b5fd" />
      <circle className="construction-light" cx="606" cy="170" r="3" fill="#c4b5fd" />

      {/* Worksite ground */}
      <path d="M0 252L720 218V440H0Z" fill="#252535" />
      <path d="M0 271L720 237" stroke="#525269" strokeWidth="2" />
      <path d="M0 288L720 254" stroke="#39394d" strokeWidth="1" />

      {/* Road under construction */}
      <path d="M310 245L448 240L625 440H97Z" fill="url(#roadSurface)" />
      <path d="M310 245L97 440" stroke="#8b8ca2" strokeWidth="2" strokeDasharray="5 7" />
      <path d="M448 240L625 440" stroke="#8b8ca2" strokeWidth="2" strokeDasharray="5 7" />

      {/* Fresh asphalt */}
      <path className="road-build" d="M352 265L410 263L526 440H204Z" fill="#53536a" opacity=".6" />
      <path d="M379 286L389 286L397 310L386 310Z" fill="#facc15" />
      <path d="M389 328L402 328L418 364L403 364Z" fill="#facc15" />
      <path d="M410 388L429 388L451 430L430 430Z" fill="#facc15" />

      {/* Work barriers */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${24 + i * 49} ${306 + i * 3}) scale(${1 + i * 0.07})`}>
          <path d="M0 25L5 0H25L30 25Z" fill="#f59e0b" />
          <path d="M4 15H27L29 21H3Z" fill="#fff7ed" />
          <path d="M-2 26H32V30H-2Z" fill="#b45309" />
        </g>
      ))}

      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${540 + i * 42} ${296 + i * 10}) scale(${1 - i * 0.12})`}>
          <path d="M0 20L4 0H22L26 20Z" fill="#f59e0b" />
          <path d="M3 12H24L25 16H2Z" fill="#fff7ed" />
          <path d="M-2 21H28V24H-2Z" fill="#b45309" />
        </g>
      ))}

      {/* Excavator tracks */}
      <g transform="translate(150 228)">
        <path d="M7 56Q0 56 0 66V76Q0 84 9 84H101Q112 84 112 75V65Q112 56 103 56Z" fill="#17171f" stroke="#77778c" strokeWidth="2" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <g key={i} className="wheel" transform={`translate(${12 + i * 14} 70)`}>
            <circle r="6" fill="#3d3d4c" stroke="#a1a1b7" strokeWidth="1.5" />
            <circle r="2" fill="#a1a1b7" />
          </g>
        ))}

        {/* Main body */}
        <path d="M14 55L23 26H90L105 56Z" fill="#f59e0b" stroke="#fbbf24" strokeWidth="2" />
        <path d="M26 29H83L89 43H22Z" fill="#fbbf24" />
        <rect x="30" y="40" width="58" height="12" rx="2" fill="#d97706" />
        <rect x="36" y="43" width="42" height="5" fill="#29293a" />
        <circle cx="75" cy="46" r="2" fill="#fde68a" />

        {/* Cabin */}
        <path d="M39 26L43 2H79L89 27Z" fill="#fbbf24" stroke="#fcd34d" strokeWidth="2" />
        <path d="M49 7H73L80 23H45Z" fill="#25283d" stroke="#a78bfa" strokeWidth="1.5" />
        <path d="M61 7V23" stroke="#6b6b83" strokeWidth="1.5" />
        <path d="M43 2H79" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" />

        {/* Moving boom and bucket */}
        <g className="excavator-arm">
          <path d="M48 8L14 -10L-3 -2" fill="none" stroke="#fbbf24" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M48 8L14 -10L-3 -2" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
          <path d="M-4 -2L-12 13L-2 19L8 7Z" fill="#f59e0b" stroke="#fcd34d" strokeWidth="2" />
        </g>

        {/* Warning beacon */}
        <circle className="construction-light" cx="85" cy="30" r="4" fill="#fde047" />
      </g>

      {/* Engineer */}
      <g className="worker-bob" transform="translate(468 235)">
        <ellipse cx="0" cy="79" rx="23" ry="5" fill="#11111c" opacity=".55" />
        {/* Legs */}
        <path d="M-10 43L-13 68L-22 73L-20 77L-7 76L0 49" fill="#303044" stroke="#a1a1b7" strokeWidth="1.5" />
        <path d="M4 46L10 66L7 74L20 76L23 71L17 65L16 42" fill="#303044" stroke="#a1a1b7" strokeWidth="1.5" />
        {/* Boots */}
        <path d="M-23 72L-7 72L-6 79H-25Z" fill="#f59e0b" />
        <path d="M7 72L21 71L25 78H7Z" fill="#f59e0b" />
        {/* Safety jacket */}
        <path d="M-13 14L-20 20L-17 44L-11 49L15 49L21 42L17 19L10 14Z" fill="#f59e0b" stroke="#fcd34d" strokeWidth="1.5" />
        <path d="M-6 16L-5 47M8 16L8 47" stroke="#fff7ed" strokeWidth="3" />
        <path d="M-17 31H19" stroke="#fff7ed" strokeWidth="3" />
        {/* Arms */}
        <path d="M-15 21L-25 37L-16 43" fill="none" stroke="#fbbf24" strokeWidth="7" strokeLinecap="round" />
        <path d="M15 21L25 33L34 29" fill="none" stroke="#fbbf24" strokeWidth="7" strokeLinecap="round" />
        <circle cx="34" cy="29" r="4" fill="#e9a36d" />
        {/* Head */}
        <circle cx="0" cy="7" r="11" fill="#b9794f" />
        <path d="M-11 6Q-12 -8 0 -9Q12 -8 12 5Z" fill="#3b2c2c" />
        {/* Helmet */}
        <path d="M-15 1Q-14 -12 0 -13Q14 -12 15 1Z" fill="#facc15" stroke="#fde68a" strokeWidth="1.5" />
        <path d="M-17 2H17" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* Blueprint hologram */}
      <g className="ai-float-delayed" transform="translate(590 216)">
        <rect x="-30" y="-22" width="61" height="44" rx="5" fill="#6d28d9" fillOpacity=".12" stroke="#a78bfa" strokeOpacity=".65" />
        <path d="M-20 -10H18M-20 -2H10M-20 6H16M-20 14H2" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="12" r="6" fill="#7c3aed" stroke="#ddd6fe" strokeWidth="1.5" />
      </g>

      {/* Worksite status panel */}
      <g transform="translate(22 22)">
        <rect width="184" height="54" rx="8" fill="#171725" stroke="#3d3d54" />
        <circle cx="15" cy="17" r="4" fill="#facc15" />
        <text x="27" y="20" fontSize="10" fontWeight="bold" fill="#e5e7eb" letterSpacing="1">CONSTRUCTION SITE</text>
        <text x="14" y="40" fontSize="9" fill="#a5b4fc">CONNECT AI / WORK IN PROGRESS</text>
      </g>

      {/* Moving scan line */}
      <g clipPath="none" opacity=".12">
        <rect className="scan-line" x="0" y="0" width="720" height="2" fill="#c4b5fd" />
      </g>

      {/* Foreground detail */}
      <path d="M0 420L720 420" stroke="#a78bfa" strokeOpacity=".2" />
      <text x="24" y="414" fill="#a1a1aa" fontSize="9" letterSpacing="2">MART101 // ENGINEERING THE FUTURE</text>
      <text x="696" y="414" textAnchor="end" fill="#a78bfa" fontSize="9">AI MODULE: IN PROGRESS</text>
    </svg>
  </div>
);

const NotFound = () => {
  const location = useLocation();
  const isConnectAi = location.pathname === "/connect-ai";

  useEffect(() => {
    if (!isConnectAi) {
      console.error(
        "404 Error: User attempted to access non-existent route:",
        location.pathname
      );
    }
  }, [location.pathname, isConnectAi]);

  if (isConnectAi) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#090910] px-4 py-12 text-white">
        <div className="pointer-events-none absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-700/10 blur-[100px]" />

        <div className="relative z-10 w-full max-w-3xl text-center">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:border-violet-400/40 hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true">←</span> Back to MART101
          </Link>

          <div className="mb-5 flex items-center justify-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">
              Under construction
            </span>
          </div>

          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            Something <span className="text-violet-400">intelligent</span>
            <br />
            is being built.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-gray-400 sm:text-base">
            Our engineers are working on connecting MART101 with the AI tools
            students love. The road to smarter campus shopping is under
            construction.
          </p>

          <div className="my-9">
            <ConstructionScene />
          </div>

          <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-white/[0.03] p-5 text-left">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-gray-200">
                AI integration
              </span>
              <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
                In progress
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-600 to-amber-400" />
            </div>

            <p className="mt-3 text-xs leading-5 text-gray-500">
              We're laying the foundation. No launch date announced yet.
            </p>
          </div>

          <p className="mt-8 text-xs tracking-wide text-gray-600">
            MART101 · CAMPUS BUYING & SELLING MADE EASY
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          Oops! Page not found
        </p>
        <Link
          to="/"
          className="text-primary underline hover:text-primary/90"
        >
          Return to Home
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
