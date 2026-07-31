import { Link } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";

const AppFooter = () => {
  return (
    <footer className="bg-navy text-white/80 mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BrandLogo size="sm" />
            <span className="font-cursive text-gold">MART101</span>
          </div>
          <p className="text-sm">The Ultimate Campus Marketplace for OOU students.</p>
        </div>
        <div>
          <h3 className="text-gold font-semibold mb-3 text-sm">Company</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-gold">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-gold">Contact Us</Link></li>
            <li><Link to="/help" className="hover:text-gold">Need Help</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-gold font-semibold mb-3 text-sm">Legal</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/terms" className="hover:text-gold">Terms of Service</Link></li>
            <li><Link to="/privacy" className="hover:text-gold">Privacy Policy</Link></li>
            <li><Link to="/condition-policy" className="hover:text-gold">Condition Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="text-center text-xs py-4 border-t border-white/10">
        © {new Date().getFullYear()} MART101. All rights reserved.
      </div>
    </footer>
  );
};

export default AppFooter;
