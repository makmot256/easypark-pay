/**
 * BITLOT - Blink Wallet API Client
 * Handles communication with the Blink invoice edge function.
 * Creates Lightning invoices and checks their payment status.
 */

import { supabase } from "@/integrations/supabase/client";

interface CreateInvoiceResponse {
  success: boolean;
  invoice?: {
    paymentHash: string;
    paymentRequest: string; // The Lightning invoice (lnbc...) for QR code
    satoshis: number;
  };
  error?: string;
}

interface CheckInvoiceResponse {
  success: boolean;
  status?: "PENDING" | "PAID";
  isPaid?: boolean;
  error?: string;
}

/**
 * Create a Lightning invoice via the Blink wallet.
 * @param amountSats - Amount in satoshis to charge
 * @param memo - Optional invoice memo (shown in wallet)
 * @returns Invoice details including the payment request string for QR display
 */
export async function createBlinkInvoice(
  amountSats: number,
  memo?: string
): Promise<CreateInvoiceResponse> {
  const { data, error } = await supabase.functions.invoke("blink-invoice", {
    body: {
      action: "create_invoice",
      amount: amountSats,
      memo,
    },
  });

  if (error) {
    console.error("Error calling blink-invoice:", error);
    return { success: false, error: error.message };
  }

  return data as CreateInvoiceResponse;
}

/**
 * Check the payment status of a Lightning invoice.
 * @param paymentRequest - The payment request from the created invoice
 * @returns Status object with isPaid boolean
 */
export async function checkBlinkPayment(
  paymentRequest: string
): Promise<CheckInvoiceResponse> {
  const { data, error } = await supabase.functions.invoke("blink-invoice", {
    body: {
      action: "check_invoice",
      paymentRequest,
    },
  });

  if (error) {
    console.error("Error checking payment:", error);
    return { success: false, error: error.message };
  }

  return data as CheckInvoiceResponse;
}
