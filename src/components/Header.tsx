/**
 * BITLOT Header Component
 * Displays the brand logo, name, slogan, and navigation tabs.
 */

import bitlotLogo from "@/assets/bitlot-logo.png";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "create", label: "⚡ New Ticket" },
  { id: "active", label: "🅿️ Active Tickets" },
  { id: "status", label: "🔍 Check Status" },
  { id: "history", label: "📋 History" },
  { id: "assistant", label: "🤖 AI Assistant" },
];

const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  return (
    <header className="border-b border-border bg-card">
      {/* Brand bar */}
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        <img
          src={bitlotLogo}
          alt="BITLOT Logo"
          width={64}
          height={64}
          className="rounded-lg"
        />
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight font-mono leading-none">
            BITLOT
          </h1>
          <p className="mt-1 text-sm md:text-base text-foreground/90 font-medium tracking-wide uppercase">
            Secure your Parking Lot
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <nav className="container mx-auto px-4 flex justify-center gap-1 overflow-x-auto pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-primary/30"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
};

export default Header;
