import { Link } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";

const AppFooter = () => {
  return (
    <footer className="bg-navy text-white/80 mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col items-center gap-6 text-center">
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-base">
          <Link to="/about" className="hover:text-gold">About</Link>
          <Link to="/terms" className="hover:text-gold">Terms</Link>
          <Link to="/privacy" className="hover:text-gold">Privacy</Link>
          <Link to="/condition-policy" className="hover:text-gold">Condition Policy</Link>
          <Link to="/contact" className="hover:text-gold">Contact</Link>
        </nav>

        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-base">
          <Link to="/help" className="hover:text-gold">Help</Link>
          <Link to="/connect-ai" className="hover:text-gold">Connect AI</Link>
        </nav>

        <a
          href="mailto:campusmart101@gmail.com"
          className="text-sm hover:text-gold"
        >
          campusmart101@gmail.com
        </a>

        <p className="text-sm max-w-md">
          MART101 – The student marketplace for Olabisi Onabanjo University (OOU), Ogun State, Nigeria.
        </p>

        <div className="text-xs pt-4 border-t border-white/10 w-full">
          © {new Date().getFullYear()} MART101. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
