/**
 * BITLOT Active Tickets Panel
 * Shows all active parking tickets with real-time duration tracking,
 * fee calculation, and a "Continue to Payment" checkout flow.
 */

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  getActiveTickets,
  calculateFee,
  ugxToSats,
  updateTicket,
  type ParkingTicket,
} from "@/lib/ticket-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ActiveTickets = () => {
  const [tickets, setTickets] = useState<ParkingTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<Record<string, string>>({});

  /** Refresh active tickets every second for real-time duration updates */
  useEffect(() => {
    const refresh = () => setTickets(getActiveTickets());
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, []);

  /** Initiate checkout — calculate fees and show payment QR */
  const handleCheckout = (ticket: ParkingTicket) => {
    const { amountUGX } = calculateFee(ticket.createdAt);
    const amountSats = ugxToSats(amountUGX);

    // Update ticket with calculated amounts and set to pending
    updateTicket(ticket.id, {
      status: "pending_payment",
      amountUGX,
      amountSats,
      checkedOutAt: new Date().toISOString(),
    });

    setSelectedTicket(ticket.id);
    setTickets(getActiveTickets());
  };

  /**
   * Simulate payment confirmation.
   * In production, this would poll the Blink wallet API for invoice status.
   */
  const handleConfirmPayment = (ticket: ParkingTicket) => {
    setPaymentStatus((prev) => ({ ...prev, [ticket.id]: "confirming" }));

    // Simulate payment verification delay
    setTimeout(() => {
      updateTicket(ticket.id, {
        status: "paid",
        paymentHash: `lnbc${Date.now()}`, // Simulated payment hash
      });

      setPaymentStatus((prev) => ({ ...prev, [ticket.id]: "paid" }));
      toast.success(`Payment confirmed for ${ticket.numberPlate}! Receipt sent.`);

      // Refresh tickets list
      setTimeout(() => {
        setSelectedTicket(null);
        setTickets(getActiveTickets());
        setPaymentStatus((prev) => {
          const copy = { ...prev };
          delete copy[ticket.id];
          return copy;
        });
      }, 2000);
    }, 3000);
  };

  /**
   * Build a Blink wallet Lightning invoice URL.
   * Format: bitcoin:?lightning=lnbc...
   * In production, you would call the Blink API to create a real invoice.
   */
  const buildBlinkInvoice = (ticket: ParkingTicket): string => {
    const { amountUGX } = calculateFee(ticket.createdAt);
    const sats = ugxToSats(amountUGX);
    // Simulated Lightning invoice — in production, use Blink's createInvoice API
    return `lightning:lnbc${sats}sat1bitlot${ticket.id.toLowerCase()}`;
  };

  if (tickets.length === 0) {
    return (
      <Card className="glow-border">
        <CardContent className="py-12 text-center">
          <p className="text-4xl mb-4">🅿️</p>
          <p className="text-muted-foreground text-lg">No active tickets</p>
          <p className="text-muted-foreground text-sm mt-1">
            Create a ticket to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-primary">
        Active Tickets ({tickets.length})
      </h2>

      {tickets.map((ticket) => {
        const { hours, minutes, amountUGX } = calculateFee(ticket.createdAt);
        const amountSats = ugxToSats(amountUGX);
        const isSelected = selectedTicket === ticket.id;
        const pStatus = paymentStatus[ticket.id];

        return (
          <Card
            key={ticket.id}
            className={`transition-all ${
              isSelected ? "glow-border-strong" : "glow-border"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center">
                <span className="font-mono text-primary">{ticket.id}</span>
                <span
                  className={`text-xs px-2 py-1 rounded font-mono ${
                    ticket.status === "pending_payment"
                      ? "bg-accent/20 text-accent"
                      : "bg-success/20 text-success"
                  }`}
                >
                  {ticket.status === "pending_payment" ? "PENDING" : "ACTIVE"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Ticket details row */}
              <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                <div>
                  <span className="text-muted-foreground text-xs">PLATE</span>
                  <p className="text-foreground font-bold">{ticket.numberPlate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">PHONE</span>
                  <p className="text-foreground">{ticket.phoneNumber}</p>
                </div>
              </div>

              {/* Duration and cost display — updates in real-time */}
              <div className="bg-secondary rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-xs text-muted-foreground">DURATION</span>
                  <p className="text-foreground font-bold font-mono">
                    {hours}h {minutes}m
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">FEE (UGX)</span>
                  <p className="text-primary font-bold font-mono">
                    {amountUGX.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">SATS ⚡</span>
                  <p className="text-accent font-bold font-mono">
                    {amountSats.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Payment flow */}
              {!isSelected ? (
                <Button
                  onClick={() => handleCheckout(ticket)}
                  className="w-full font-bold"
                >
                  Continue to Payment →
                </Button>
              ) : (
                <div className="space-y-4">
                  {/* Lightning invoice QR code from Blink wallet */}
                  <div className="flex flex-col items-center space-y-3">
                    <p className="text-sm text-muted-foreground text-center">
                      Scan with your Lightning wallet to pay{" "}
                      <span className="text-primary font-bold">
                        {amountSats.toLocaleString()} sats
                      </span>
                    </p>
                    <div className="bg-foreground p-4 rounded-lg">
                      <QRCodeSVG
                        value={buildBlinkInvoice(ticket)}
                        size={180}
                        bgColor="#f5f0d0"
                        fgColor="#1a1408"
                        level="M"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground font-mono break-all text-center px-4">
                      {buildBlinkInvoice(ticket)}
                    </p>
                  </div>

                  {/* Payment confirmation */}
                  {pStatus === "confirming" ? (
                    <div className="text-center py-3">
                      <div className="animate-spin text-2xl mb-2">⚡</div>
                      <p className="text-accent font-mono text-sm">
                        Confirming payment...
                      </p>
                    </div>
                  ) : pStatus === "paid" ? (
                    <div className="text-center py-3 bg-success/10 rounded-lg">
                      <p className="text-2xl mb-1">✅</p>
                      <p className="text-success font-bold">Payment Confirmed!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Receipt sent to {ticket.phoneNumber}
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleConfirmPayment(ticket)}
                      variant="outline"
                      className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                    >
                      ✅ Confirm Payment Received
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ActiveTickets;
