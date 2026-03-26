/**
 * BITLOT Active Tickets Panel
 * Shows all active parking tickets with real-time duration tracking,
 * fee calculation, and Lightning payment via Blink wallet.
 * 
 * Flow:
 * 1. User clicks "Continue to Payment"
 * 2. Edge function creates a real Lightning invoice via Blink API
 * 3. QR code displays the Lightning invoice for scanning
 * 4. System polls for payment confirmation
 * 5. On payment, receipt is generated and confirmation shown
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  getActiveTickets,
  calculateFee,
  ugxToSats,
  updateTicket,
  type ParkingTicket,
} from "@/lib/ticket-store";
import { createBlinkInvoice, checkBlinkPayment } from "@/lib/blink-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** Stores invoice data for each ticket being paid */
interface InvoiceData {
  paymentRequest: string; // Lightning invoice string (for QR code)
  paymentHash: string;    // Used to check payment status
  amountSats: number;
}

const ActiveTickets = () => {
  const [tickets, setTickets] = useState<ParkingTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Record<string, InvoiceData>>({});
  const [loadingInvoice, setLoadingInvoice] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<Record<string, string>>({});

  // Ref to hold polling interval IDs so we can clean them up
  const pollingIntervals = useRef<Record<string, NodeJS.Timeout>>({});

  /** Refresh active tickets every second for real-time duration updates */
  useEffect(() => {
    const refresh = () => setTickets(getActiveTickets());
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, []);

  /** Clean up all polling intervals on unmount */
  useEffect(() => {
    return () => {
      Object.values(pollingIntervals.current).forEach(clearInterval);
    };
  }, []);

  /**
   * Start polling for payment confirmation.
   * Checks the Blink API every 5 seconds for payment status.
   */
  const startPaymentPolling = useCallback(
    (ticketId: string, paymentRequest: string, paymentHash?: string) => {
      // Clear any existing poll for this ticket
      if (pollingIntervals.current[ticketId]) {
        clearInterval(pollingIntervals.current[ticketId]);
      }

      const interval = setInterval(async () => {
        try {
          const result = await checkBlinkPayment(paymentRequest);

          if (result.isPaid) {
            // Payment confirmed! Update the ticket status
            clearInterval(pollingIntervals.current[ticketId]);
            delete pollingIntervals.current[ticketId];

            updateTicket(ticketId, {
              status: "paid",
              paymentHash,
            });

            setPaymentStatus((prev) => ({ ...prev, [ticketId]: "paid" }));
            toast.success("⚡ Payment confirmed! Receipt sent.");

            // Clean up after showing confirmation
            setTimeout(() => {
              setSelectedTicket(null);
              setTickets(getActiveTickets());
              setInvoices((prev) => {
                const copy = { ...prev };
                delete copy[ticketId];
                return copy;
              });
              setPaymentStatus((prev) => {
                const copy = { ...prev };
                delete copy[ticketId];
                return copy;
              });
            }, 3000);
          }
        } catch (err) {
          console.error("Payment poll error:", err);
        }
      }, 5000); // Poll every 5 seconds

      pollingIntervals.current[ticketId] = interval;
    },
    []
  );

  /**
   * Initiate checkout:
   * 1. Calculate the fee based on parking duration
   * 2. Convert UGX to sats
   * 3. Call the edge function to create a real Lightning invoice
   * 4. Display the QR code and start polling for payment
   */
  const handleCheckout = async (ticket: ParkingTicket) => {
    const { amountUGX } = calculateFee(ticket.createdAt);
    const amountSats = ugxToSats(amountUGX);

    setLoadingInvoice(ticket.id);

    try {
      // Call the Blink API edge function to create a Lightning invoice
      const result = await createBlinkInvoice(
        amountSats,
        `BITLOT Parking: ${ticket.numberPlate} - ${ticket.id}`
      );

      if (!result.success || !result.invoice) {
        throw new Error(result.error || "Failed to create invoice");
      }

      // Store invoice data for this ticket
      setInvoices((prev) => ({
        ...prev,
        [ticket.id]: {
          paymentRequest: result.invoice!.paymentRequest,
          paymentHash: result.invoice!.paymentHash,
          amountSats: result.invoice!.satoshis,
        },
      }));

      // Update ticket with calculated amounts
      updateTicket(ticket.id, {
        status: "pending_payment",
        amountUGX,
        amountSats,
        checkedOutAt: new Date().toISOString(),
      });

      setSelectedTicket(ticket.id);
      setTickets(getActiveTickets());

      // Start polling for payment confirmation
      startPaymentPolling(ticket.id, result.invoice!.paymentRequest, result.invoice!.paymentHash);

      toast.success("Lightning invoice created! Scan to pay.");
    } catch (err) {
      console.error("Invoice creation error:", err);
      toast.error(
        `Failed to create invoice: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setLoadingInvoice(null);
    }
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
        const invoice = invoices[ticket.id];
        const pStatus = paymentStatus[ticket.id];
        const isLoading = loadingInvoice === ticket.id;

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
              {/* Ticket details */}
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

              {/* Real-time duration and cost display */}
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
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⚡</span> Creating Invoice...
                    </span>
                  ) : (
                    "Continue to Payment →"
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  {/* Show real Lightning invoice QR code from Blink */}
                  {invoice && pStatus !== "paid" && (
                    <div className="flex flex-col items-center space-y-3">
                      <p className="text-sm text-muted-foreground text-center">
                        Scan with your Lightning wallet to pay{" "}
                        <span className="text-primary font-bold">
                          {invoice.amountSats.toLocaleString()} sats
                        </span>
                      </p>

                      {/* QR code containing the real Lightning invoice */}
                      <div className="bg-foreground p-4 rounded-lg">
                        <QRCodeSVG
                          value={invoice.paymentRequest}
                          size={200}
                          bgColor="#f5f0d0"
                          fgColor="#1a1408"
                          level="M"
                        />
                      </div>

                      {/* Show truncated invoice string for copy */}
                      <div className="w-full">
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(invoice.paymentRequest);
                            toast.success("Invoice copied to clipboard!");
                          }}
                          className="w-full text-xs text-muted-foreground font-mono break-all text-center px-4 py-2 bg-secondary rounded hover:bg-secondary/80 transition-colors cursor-pointer"
                          title="Click to copy invoice"
                        >
                          {invoice.paymentRequest.substring(0, 40)}...
                          <span className="block text-primary text-[10px] mt-1">
                            TAP TO COPY FULL INVOICE
                          </span>
                        </button>
                      </div>

                      {/* Polling indicator */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="animate-pulse">●</span>
                        Waiting for payment confirmation...
                      </div>
                    </div>
                  )}

                  {/* Payment confirmed state */}
                  {pStatus === "paid" && (
                    <div className="text-center py-4 bg-success/10 rounded-lg">
                      <p className="text-3xl mb-2">✅</p>
                      <p className="text-success font-bold text-lg">
                        Payment Confirmed!
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Receipt sent to {ticket.phoneNumber}
                      </p>
                    </div>
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
