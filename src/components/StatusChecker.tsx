/**
 * BITLOT Status Checker
 * Allows looking up a ticket by number plate to view its current status,
 * duration, and fee information.
 */

import { useState } from "react";
import {
  findTicketsByPlate,
  calculateFee,
  ugxToSats,
  type ParkingTicket,
} from "@/lib/ticket-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const StatusChecker = () => {
  const [searchPlate, setSearchPlate] = useState("");
  const [results, setResults] = useState<ParkingTicket[] | null>(null);

  /** Search for tickets matching the given number plate */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPlate.trim()) return;
    const found = findTicketsByPlate(searchPlate);
    setResults(found);
  };

  /** Render a status badge with appropriate color */
  const StatusBadge = ({ status }: { status: ParkingTicket["status"] }) => {
    const styles: Record<string, string> = {
      active: "bg-success/20 text-success",
      pending_payment: "bg-accent/20 text-accent",
      paid: "bg-primary/20 text-primary",
      expired: "bg-destructive/20 text-destructive",
    };
    return (
      <span className={`text-xs px-2 py-1 rounded font-mono font-bold ${styles[status]}`}>
        {status.toUpperCase().replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search form */}
      <Card className="glow-border">
        <CardHeader>
          <CardTitle className="text-primary">🔍 Check Ticket Status</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter a number plate to look up ticket status
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="searchPlate" className="sr-only">
                Number Plate
              </Label>
              <Input
                id="searchPlate"
                placeholder="Enter number plate..."
                value={searchPlate}
                onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
                className="font-mono text-lg tracking-wider bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Search results */}
      {results !== null && (
        <div className="space-y-4">
          {results.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-3xl mb-2">❌</p>
                <p className="text-muted-foreground">
                  No tickets found for plate "{searchPlate}"
                </p>
              </CardContent>
            </Card>
          ) : (
            results.map((ticket) => {
              const { hours, minutes, amountUGX } = calculateFee(ticket.createdAt);
              const amountSats = ugxToSats(amountUGX);

              return (
                <Card key={ticket.id} className="glow-border">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-primary font-bold text-lg">
                        {ticket.id}
                      </span>
                      <StatusBadge status={ticket.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm font-mono">
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
                        <span className="text-muted-foreground text-xs">DURATION</span>
                        <p className="text-foreground font-bold">
                          {hours}h {minutes}m
                        </p>
                      </div>
                    </div>

                    {/* Fee summary */}
                    {ticket.status !== "paid" && (
                      <div className="bg-secondary rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <span className="text-xs text-muted-foreground">
                            CURRENT FEE
                          </span>
                          <p className="text-primary font-bold font-mono">
                            {amountUGX.toLocaleString()} UGX
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground">IN SATS</span>
                          <p className="text-accent font-bold font-mono">
                            ⚡ {amountSats.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Show payment info for paid tickets */}
                    {ticket.status === "paid" && (
                      <div className="bg-success/10 rounded-lg p-3 text-center">
                        <p className="text-success font-bold">✅ Paid</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {ticket.amountUGX?.toLocaleString()} UGX ({ticket.amountSats?.toLocaleString()} sats)
                        </p>
                        {ticket.checkedOutAt && (
                          <p className="text-xs text-muted-foreground">
                            Checked out: {new Date(ticket.checkedOutAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default StatusChecker;
