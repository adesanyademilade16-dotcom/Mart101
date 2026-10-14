
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

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
      <main className="connect-ai-page">
        <style>{`
          .connect-ai-page {
            min-height: 100vh;
            background: #090b14;
            color: #f8fafc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px 20px;
            overflow: hidden;
            position: relative;
            isolation: isolate;
            font-family: inherit;
          }

          .connect-ai-page::before {
            content: "";
            position: absolute;
            inset: 0;
            z-index: -1;
            background:
              radial-gradient(ellipse at 50% 45%,
                rgba(124, 58, 237, .18), transparent 55%),
              linear-gradient(rgba(255,255,255,.025) 1px,
                transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,.025) 1px,
                transparent 1px);
            background-size: auto, 36px 36px, 36px 36px;
          }

          .construction-content {
            width: 100%;
            max-width: 760px;
            text-align: center;
            animation: cai-enter .8s ease both;
          }

          .construction-badge {
            display: inline-flex;
            align-items: center;
            gap: 9px;
            border: 1px solid rgba(250,204,21,.3);
            border-radius: 999px;
            padding: 9px 15px;
            background: rgba(250,204,21,.07);
            color: #fde68a;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: .15em;
          }

          .construction-light {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #facc15;
            box-shadow: 0 0 12px #facc15;
            animation: cai-pulse 1.5s infinite;
          }

          .construction-scene {
            width: 100%;
            max-width: 620px;
            margin: 20px auto 8px;
            position: relative;
          }

          .construction-scene svg {
            display: block;
            width: 100%;
            height: auto;
            overflow: visible;
          }

          .excavator-arm {
            transform-box: fill-box;
            transform-origin: 10% 90%;
            animation: cai-dig 2.8s ease-in-out infinite;
          }

          .road-roller {
            animation: cai-roll 7s ease-in-out infinite;
          }

          .road-stripe {
            animation: cai-road 2.5s linear infinite;
          }

          .site-light {
            animation: cai-pulse 2s ease-in-out infinite alternate;
          }

          .construction-content h1 {
            font-size: clamp(34px, 7vw, 58px);
            line-height: 1.05;
            letter-spacing: -.045em;
            font-weight: 900;
            margin: 18px 0 14px;
          }

          .construction-content h1 span {
            color: #a78bfa;
          }

          .construction-description {
            color: #a1a1b5;
            font-size: 15px;
            line-height: 1.8;
            max-width: 490px;
            margin: 0 auto;
          }

          .construction-status {
            margin: 25px auto 0;
            padding: 15px 18px;
            max-width: 410px;
            border: 1px solid rgba(255,255,255,.09);
            border-radius: 14px;
            background: rgba(255,255,255,.035);
            text-align: left;
          }

          .construction-status-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .12em;
            color: #c4b5fd;
          }

          .construction-status-top span:last-child {
            color: #facc15;
          }

          .construction-progress {
            margin-top: 12px;
            height: 5px;
            overflow: hidden;
            border-radius: 999px;
            background: #262538;
          }

          .construction-progress::after {
            content: "";
            display: block;
            width: 36%;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, #7c3aed, #c4b5fd);
            animation: cai-progress 2.5s ease-in-out infinite alternate;
          }

          .construction-status-note {
            margin-top: 10px;
            color: #77788e;
            font-size: 11px;
          }

          .construction-home {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            margin-top: 25px;
            padding: 13px 20px;
            border: 1px solid rgba(196,181,253,.35);
            border-radius: 10px;
            color: #fff;
            text-decoration: none;
            font-size: 13px;
            font-weight: 700;
            transition: background .2s, transform .2s;
          }

          .construction-home:hover {
            background: rgba(139,92,246,.15);
            transform: translateY(-2px);
          }

          .construction-footer {
            margin-top: 35px;
            color: #55566b;
            font-size: 10px;
            letter-spacing: .2em;
            font-weight: 700;
          }

          @keyframes cai-enter {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes cai-pulse {
            0%, 100% { opacity: .55; }
            50% { opacity: 1; }
          }

          @keyframes cai-dig {
            0%, 100% { transform: rotate(0); }
            45% { transform: rotate(-8deg); }
            70% { transform: rotate(5deg); }
          }

          @keyframes cai-roll {
            0%, 10% { transform: translateX(-15px); }
            48%, 60% { transform: translateX(15px); }
            95%, 100% { transform: translateX(-15px); }
          }

          @keyframes cai-road {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: -36; }
          }

          @keyframes cai-progress {
            from { width: 25%; }
            to { width: 68%; }
          }

          @media (max-width: 480px) {
            .connect-ai-page { padding: 28px 16px; }
            .construction-scene { margin-top: 26px; }
            .construction-description { font-size: 14px; }
            .construction-footer { font-size: 9px; }
          }

          @media (prefers-reduced-motion: reduce) {
            .connect-ai-page *,
            .connect-ai-page *::before,
            .connect-ai-page *::after {
              animation-duration: .01ms !important;
              animation-iteration-count: 1 !important;
              scroll-behavior: auto !important;
            }
          }
        `}</style>

        <section className="construction-content">
          <div className="construction-badge">
            <span className="construction-light" />
            MART101 DEVELOPMENT ZONE
          </div>

          <div className="construction-scene">
            <svg
              viewBox="0 0 620 300"
              role="img"
              aria-label="Animated illustration of an engineer and machinery constructing a road toward a connected AI destination"
            >
              <defs>
                <linearGradient id="cai-road" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#343449" />
                  <stop offset="100%" stopColor="#171725" />
                </linearGradient>
                <linearGradient id="cai-sky" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#201b42" />
                  <stop offset="100%" stopColor="#101321" />
                </linearGradient>
              </defs>

              <rect x="8" y="8" width="604" height="284" rx="22"
                fill="url(#cai-sky)" stroke="#373052" />

              {/* Distant AI destination */}
              <circle cx="470" cy="69" r="37"
                fill="#8b5cf6" opacity=".09" />
              <circle cx="470" cy="69" r="25"
                fill="none" stroke="#a78bfa" strokeWidth="1.5"
                opacity=".6" />
              <circle cx="470" cy="69" r="16"
                fill="#7c3aed" opacity=".18" />
              <g stroke="#c4b5fd" strokeWidth="1.5"
                fill="none" className="site-light">
                <path d="M462 61 L478 77 M478 61 L462 77" />
                <circle cx="470" cy="69" r="6" />
              </g>
              <text x="470" y="112" fill="#c4b5fd" fontSize="10"
                textAnchor="middle" letterSpacing="2">AI CONNECT</text>

              {/* Landscape */}
              <path d="M9 180 L100 135 L182 174 L270 130 L352 172
                L430 145 L510 174 L611 135 L611 291 L9 291 Z"
                fill="#202b35" opacity=".9" />
              <path d="M9 218 L135 180 L220 214 L335 178
                L425 210 L525 179 L611 213 L611 291 L9 291 Z"
                fill="#293d37" />

              {/* Road extending into the distance */}
              <path d="M270 157 L345 157 L520 291 L96 291 Z"
                fill="url(#cai-road)" stroke="#56546a" strokeWidth="1.5" />
              <path d="M306 170 L310 186 L314 202 L320 222 L326 244
                L333 267 L338 291"
                stroke="#facc15" strokeWidth="3" strokeLinecap="round"
                strokeDasharray="9 10" fill="none" className="road-stripe" />
              <path d="M274 169 L244 220 L215 291"
                stroke="#73718a" strokeWidth="2" fill="none" />
              <path d="M342 169 L380 220 L405 291"
                stroke="#73718a" strokeWidth="2" fill="none" />

              {/* Construction barriers */}
              {#each [0,1,2,3,4] as n}
                <g key={n} transform={`translate(${34 + n * 28}, ${218 + n * 5})`}>
                  <path d="M0 0 L19 0 L16 24 L3 24 Z"
                    fill="#facc15" stroke="#d97706" strokeWidth="1" />
                  <path d="M2 15 L17 5" stroke="#202033" strokeWidth="5" />
                </g>
              {/each}

              {/* Excavator tracks */}
              <g transform="translate(102 157)">
                <ellipse cx="55" cy="59" rx="49" ry="13"
                  fill="#11141c" stroke="#71717a" strokeWidth="3" />
                <path d="M16 48 L27 27 L79 27 L94 48 Z"
                  fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
                <rect x="32" y="12" width="38" height="27" rx="4"
                  fill="#eab308" stroke="#fef08a" />
                <path d="M40 16 L61 16 L61 29 L40 29 Z"
                  fill="#273747" stroke="#64748b" />
                <path d="M30 14 L36 4 L66 4 L73 14"
                  fill="#facc15" stroke="#ca8a04" />
                {/* Animated excavator arm */}
                <g className="excavator-arm" stroke="#facc15"
                  strokeWidth="11" strokeLinecap="round" fill="none">
                  <path d="M62 12 L82 -8 L109 4" />
                  <path d="M109 4 L125 29" strokeWidth="8" />
                  <path d="M118 25 L132 24 L127 38 L119 35 Z"
                    fill="#b7791f" strokeWidth="2" />
                </g>
                <circle cx="62" cy="12" r="6" fill="#fef08a" />
                <circle cx="82" cy="-8" r="5" fill="#fef08a" />
              </g>

              {/* Worker in hard hat */}
              <g transform="translate(415 191)">
                <ellipse cx="20" cy="69" rx="25" ry="5"
                  fill="#11141c" opacity=".65" />
                <path d="M10 43 L6 65 L15 65 L22 47 L30 65 L39 65 L32 42"
                  fill="#374151" stroke="#94a3b8" strokeWidth="1.5" />
                <path d="M10 25 L30 25 L36 48 L6 48 Z"
                  fill="#7c3aed" stroke="#a78bfa" strokeWidth="1.5" />
                <path d="M7 31 L35 31" stroke="#facc15" strokeWidth="4" />
                <circle cx="20" cy="15" r="11" fill="#b77952" />
                <path d="M7 12 Q8 -1 20 0 Q32 0 33 12 Z"
                  fill="#facc15" stroke="#fef08a" strokeWidth="1.5" />
                <path d="M5 12 L35 12" stroke="#eab308" strokeWidth="4"
                  strokeLinecap="round" />
                <path d="M10 28 L0 41 L-8 36"
                  stroke="#b77952" strokeWidth="7" strokeLinecap="round"
                  fill="none" />
                <path d="M31 28 L42 38 L50 29"
                  stroke="#b77952" strokeWidth="7" strokeLinecap="round"
                  fill="none" />
              </g>

              {/* Road roller */}
              <g className="road-roller" transform="translate(322 204)">
                <rect x="0" y="16" width="49" height="20" rx="4"
                  fill="#f59e0b" stroke="#fcd34d" />
                <rect x="24" y="0" width="21" height="21" rx="3"
                  fill="#facc15" stroke="#fef08a" />
                <rect x="28" y="4" width="13" height="9" rx="1"
                  fill="#334155" />
                <circle cx="10" cy="37" r="12"
                  fill="#242433" stroke="#a1a1aa" strokeWidth="3" />
                <circle cx="42" cy="37" r="8"
                  fill="#242433" stroke="#a1a1aa" strokeWidth="3" />
              </g>

              {/* Floating construction dust / tech particles */}
              <g fill="#c4b5fd">
                <circle cx="88" cy="85" r="2" opacity=".8" />
                <circle cx="123" cy="68" r="3" opacity=".6" />
                <circle cx="184" cy="92" r="2" opacity=".7" />
                <circle cx="543" cy="132" r="3" opacity=".7" />
                <circle cx="509" cy="49" r="2" opacity=".8" />
              </g>

              <text x="28" y="35" fill="#a1a1aa" fontSize="9"
                letterSpacing="2">SITE 001 // MART101</text>
              <text x="28" y="49" fill="#71717a" fontSize="8"
                letterSpacing="1">FUTURE CONNECTIONS IN PROGRESS</text>
            </svg>
          </div>

          <h1>
            We're building<br />
            <span>something intelligent.</span>
          </h1>

          <p className="construction-description">
            Our engineers are laying the groundwork for MART101 AI Connect.
            Soon, students will be able to connect their favourite AI tools
            and unlock a smarter campus experience.
          </p>

          <div className="construction-status">
            <div className="construction-status-top">
              <span>CONSTRUCTION STATUS</span>
              <span>IN PROGRESS</span>
            </div>
            <div className="construction-progress" />
            <div className="construction-status-note">
              Good things take engineering. We're on it.
            </div>
          </div>

          <Link to="/" className="construction-home">
            <span aria-hidden="true">←</span> Back to MART101
          </Link>

          <footer className="construction-footer">
            MART101 · CAMPUS BUYING & SELLING MADE EASY
          </footer>
        </section>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          Oops! Page not found
        </p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
