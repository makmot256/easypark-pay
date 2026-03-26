/**
 * BITLOT Ticket Store
 * Manages parking tickets in localStorage as a simple in-memory/persistent store.
 * In production, this would be replaced with a database backend.
 */

export interface ParkingTicket {
  /** Unique ticket ID (e.g., BL-XXXXXX) */
  id: string;
  /** Vehicle number plate */
  numberPlate: string;
  /** Driver's phone number */
  phoneNumber: string;
  /** ISO timestamp when ticket was created */
  createdAt: string;
  /** ISO timestamp when ticket was checked out (null if still active) */
  checkedOutAt: string | null;
  /** Payment status */
  status: "active" | "pending_payment" | "paid" | "expired";
  /** Amount in UGX calculated at checkout */
  amountUGX: number | null;
  /** Amount in satoshis */
  amountSats: number | null;
  /** Blink invoice payment hash */
  paymentHash: string | null;
}

const STORAGE_KEY = "bitlot_tickets";

/** Generate a unique ticket ID with BL- prefix */
export function generateTicketId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "BL-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Load all tickets from localStorage */
export function loadTickets(): ParkingTicket[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/** Save tickets array to localStorage */
function saveTickets(tickets: ParkingTicket[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

/** Create a new parking ticket */
export function createTicket(numberPlate: string, phoneNumber: string): ParkingTicket {
  const ticket: ParkingTicket = {
    id: generateTicketId(),
    numberPlate: numberPlate.toUpperCase().trim(),
    phoneNumber: phoneNumber.trim(),
    createdAt: new Date().toISOString(),
    checkedOutAt: null,
    status: "active",
    amountUGX: null,
    amountSats: null,
    paymentHash: null,
  };

  const tickets = loadTickets();
  tickets.push(ticket);
  saveTickets(tickets);
  return ticket;
}

/** Find ticket by ID */
export function findTicketById(id: string): ParkingTicket | undefined {
  return loadTickets().find((t) => t.id === id);
}

/** Find tickets by number plate */
export function findTicketsByPlate(numberPlate: string): ParkingTicket[] {
  const plate = numberPlate.toUpperCase().trim();
  return loadTickets().filter((t) => t.numberPlate === plate);
}

/** Update a ticket */
export function updateTicket(id: string, updates: Partial<ParkingTicket>): ParkingTicket | null {
  const tickets = loadTickets();
  const index = tickets.findIndex((t) => t.id === id);
  if (index === -1) return null;

  tickets[index] = { ...tickets[index], ...updates };
  saveTickets(tickets);
  return tickets[index];
}

/**
 * Calculate parking fee based on duration.
 * Rates:
 * - 0-1 hour: 2000 UGX
 * - Each additional hour: 1000 UGX
 * - Maximum: 24 hours
 */
export function calculateFee(createdAt: string): { hours: number; minutes: number; amountUGX: number } {
  const start = new Date(createdAt).getTime();
  const now = Date.now();
  const diffMs = now - start;

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Calculate fee: first hour = 2000 UGX, each additional hour = 1000 UGX
  let amountUGX: number;
  if (totalMinutes <= 60) {
    amountUGX = 2000;
  } else {
    // Ceiling the extra hours (partial hours count as full)
    const extraHours = Math.ceil((totalMinutes - 60) / 60);
    amountUGX = 2000 + extraHours * 1000;
  }

  return { hours, minutes, amountUGX };
}

/**
 * Convert UGX to satoshis.
 * Using approximate rate: 1 BTC ≈ 250,000,000 UGX
 * 1 sat = 2.5 UGX → 1 UGX = 0.4 sats
 * This is a simplified conversion; in production, use a live rate API.
 */
export function ugxToSats(ugx: number): number {
  const SATS_PER_UGX = 0.4; // Approximate conversion rate
  return Math.ceil(ugx * SATS_PER_UGX);
}

/** Get all active (non-paid, non-expired) tickets */
export function getActiveTickets(): ParkingTicket[] {
  return loadTickets().filter(
    (t) => t.status === "active" || t.status === "pending_payment"
  );
}

/** Get all paid tickets */
export function getPaidTickets(): ParkingTicket[] {
  return loadTickets().filter((t) => t.status === "paid");
}
