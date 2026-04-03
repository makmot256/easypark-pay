/**
 * BITLOT - Main Application Page
 * Lightning-powered parking ticketing POS system.
 * Routes between: ticket creation, active tickets, status check, and history.
 */

import { useState } from "react";
import Header from "@/components/Header";
import TicketCreator from "@/components/TicketCreator";
import ActiveTickets from "@/components/ActiveTickets";
import StatusChecker from "@/components/StatusChecker";
import TicketHistory from "@/components/TicketHistory";
import AIAssistant from "@/components/AIAssistant";

const Index = () => {
  /** Currently active navigation tab */
  const [activeTab, setActiveTab] = useState("create");

  /** Render the component for the active tab */
  const renderContent = () => {
    switch (activeTab) {
      case "create":
        return <TicketCreator />;
      case "active":
        return <ActiveTickets />;
      case "status":
        return <StatusChecker />;
      case "history":
        return <TicketHistory />;
      case "assistant":
        return <AIAssistant />;
      default:
        return <TicketCreator />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main content area */}
      <main className="container mx-auto px-4 py-6 max-w-lg">
        {renderContent()}

        {/* Footer with rate info */}
        <footer className="mt-8 py-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground font-mono">
            Rates: 0-1hr = 2,000 UGX | Extra hour = 1,000 UGX | Max 24hrs
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            SATS: 0-1hr = 1 sat | Extra hour = 0.5 sats
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ⚡ Powered by Bitcoin Lightning via Blink Wallet
          </p>
          <p className="text-xs text-primary font-bold mt-2">
            BITLOT — Secure your Parking Lot
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
