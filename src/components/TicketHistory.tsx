/**
 * BITLOT Ticket History
 * Shows all paid/completed tickets with receipt details.
 * Receipts can be shared with the driver.
 */

import { useState, useEffect } from "react";
import { getPaidTickets, type ParkingTicket } from "@/lib/ticket-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const TicketHistory = () => {
  const [tickets, setTickets] = useState<ParkingTicket[]>([]);

  useEffect(() => {
    setTickets(getPaidTickets());
  }, []);

  /** Share receipt via Web Share API or copy to clipboard */
  const handleShareReceipt = async (ticket: ParkingTicket) => {
    const receiptText = `
🎫 BITLOT Parking Receipt
━━━━━━━━━━━━━━━━━━━━
Ticket: ${ticket.id}
Plate: ${ticket.numberPlate}
Phone: ${ticket.phoneNumber}
Entry: ${new Date(ticket.createdAt).toLocaleString()}
Exit: ${ticket.checkedOutAt ? new Date(ticket.checkedOutAt).toLocaleString() : "N/A"}
Amount: ${ticket.amountUGX?.toLocaleString()} UGX (${ticket.amountSats?.toLocaleString()} sats ⚡)
Status: PAID ✅
━━━━━━━━━━━━━━━━━━━━
Powered by BITLOT - Secure your Parking Lot
    `.trim();

    // Try native share API first, fall back to clipboard
    if (navigator.share) {
      try {
        await navigator.share({ title: "BITLOT Receipt", text: receiptText });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(receiptText);
      toast.success("Receipt copied to clipboard!");
    }
  };

  if (tickets.length === 0) {
    return (
      <Card className="glow-border">
        <CardContent className="py-12 text-center">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-muted-foreground text-lg">No payment history yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-primary">
        Payment History ({tickets.length})
      </h2>

      {tickets.map((ticket) => (
        <Card key={ticket.id} className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center">
              <span className="font-mono text-primary">{ticket.id}</span>
              <span className="text-xs px-2 py-1 rounded bg-success/20 text-success font-mono font-bold">
                PAID ✅
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              <div>
                <span className="text-muted-foreground text-xs">PLATE</span>
                <p className="text-foreground font-bold">{ticket.numberPlate}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">PHONE</span>
                <p className="text-foreground">{ticket.phoneNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">ENTRY</span>
                <p className="text-foreground text-xs">
                  {new Date(ticket.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">EXIT</span>
                <p className="text-foreground text-xs">
                  {ticket.checkedOutAt
                    ? new Date(ticket.checkedOutAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>

            <div className="bg-secondary rounded-lg p-3 flex justify-between items-center">
              <div>
                <span className="text-xs text-muted-foreground">PAID</span>
                <p className="text-primary font-bold font-mono">
                  {ticket.amountUGX?.toLocaleString()} UGX
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">IN SATS</span>
                <p className="text-accent font-bold font-mono">
                  ⚡ {ticket.amountSats?.toLocaleString()}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => handleShareReceipt(ticket)}
              className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              📤 Share Receipt
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TicketHistory;
