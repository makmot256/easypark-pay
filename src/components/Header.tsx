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
];

const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  return (
    <header className="border-b border-border bg-card">
      {/* Brand bar */}
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        <img
          src={bitlotLogo}
          alt="BITLOT Logo"
          width={56}
          height={56}
          className="rounded-lg"
        />
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight font-mono">
            BITLOT
          </h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">
            Secure your Parking Lot
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <nav className="container mx-auto px-4 flex gap-1 overflow-x-auto pb-0">
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
