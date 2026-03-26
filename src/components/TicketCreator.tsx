/**
 * BITLOT Ticket Creator
 * Form to capture vehicle number plate and phone number,
 * then generates a ticket with a QR code containing ticket details.
 */

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createTicket, type ParkingTicket } from "@/lib/ticket-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const TicketCreator = () => {
  const [numberPlate, setNumberPlate] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [generatedTicket, setGeneratedTicket] = useState<ParkingTicket | null>(null);

  /** Handle form submission to create a new parking ticket */
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (!numberPlate.trim()) {
      toast.error("Please enter a number plate");
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.trim().length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    // Create the ticket and store it
    const ticket = createTicket(numberPlate, phoneNumber);
    setGeneratedTicket(ticket);
    toast.success(`Ticket ${ticket.id} created successfully!`);

    // Reset form
    setNumberPlate("");
    setPhoneNumber("");
  };

  /** Build QR code data string containing all ticket details */
  const buildQRData = (ticket: ParkingTicket): string => {
    return JSON.stringify({
      system: "BITLOT",
      ticketId: ticket.id,
      numberPlate: ticket.numberPlate,
      phoneNumber: ticket.phoneNumber,
      entryTime: ticket.createdAt,
      status: ticket.status,
    });
  };

  return (
    <div className="space-y-6">
      {/* Ticket creation form */}
      <Card className="glow-border">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            ⚡ Create Parking Ticket
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter vehicle details to generate a new parking ticket
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="numberPlate" className="text-foreground">
                Number Plate
              </Label>
              <Input
                id="numberPlate"
                placeholder="e.g. UAX 123A"
                value={numberPlate}
                onChange={(e) => setNumberPlate(e.target.value.toUpperCase())}
                className="font-mono text-lg tracking-wider bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-foreground">
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                placeholder="e.g. +256700123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="font-mono text-lg bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                type="tel"
              />
            </div>

            <Button type="submit" className="w-full text-lg font-bold py-6">
              🎫 Generate Ticket
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Generated ticket display with QR code */}
      {generatedTicket && (
        <Card className="glow-border-strong animate-pulse-glow">
          <CardHeader className="text-center">
            <CardTitle className="text-primary text-xl">
              🎫 Ticket Generated
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            {/* QR Code — scanning this reveals the ticket details */}
            <div className="bg-foreground p-4 rounded-lg">
              <QRCodeSVG
                value={buildQRData(generatedTicket)}
                size={200}
                bgColor="#f5f0d0"
                fgColor="#1a1408"
                level="H"
              />
            </div>

            {/* Ticket details */}
            <div className="w-full space-y-2 font-mono text-sm">
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Ticket ID</span>
                <span className="text-primary font-bold">{generatedTicket.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Plate</span>
                <span className="text-foreground">{generatedTicket.numberPlate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Phone</span>
                <span className="text-foreground">{generatedTicket.phoneNumber}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Entry Time</span>
                <span className="text-foreground">
                  {new Date(generatedTicket.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Scan the QR code to view ticket details. Valid for 24 hours.
            </p>

            {/* Button to create another ticket */}
            <Button
              variant="outline"
              onClick={() => setGeneratedTicket(null)}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Create Another Ticket
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TicketCreator;
