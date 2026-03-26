/**
 * BITLOT - Blink Lightning Invoice Edge Function
 * 
 * Creates a Lightning Network invoice via the Blink wallet GraphQL API.
 * Supports two actions:
 *   1. "create_invoice" — generates a new Lightning invoice for a given amount in sats
 *   2. "check_invoice" — checks the payment status of an existing invoice
 * 
 * Blink API Docs: https://dev.blink.sv/
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers required for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Blink API endpoint (production)
const BLINK_API_URL = "https://api.blink.sv/graphql";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Retrieve secrets from environment
    const BLINK_API_KEY = Deno.env.get("BLINK_API_KEY");
    if (!BLINK_API_KEY) {
      throw new Error("BLINK_API_KEY is not configured");
    }

    const BLINK_WALLET_ID = Deno.env.get("BLINK_WALLET_ID");
    if (!BLINK_WALLET_ID) {
      throw new Error("BLINK_WALLET_ID is not configured");
    }

    const { action, amount, paymentHash, memo } = await req.json();

    // ==========================================
    // ACTION: Create a new Lightning invoice
    // ==========================================
    if (action === "create_invoice") {
      if (!amount || amount <= 0) {
        return new Response(
          JSON.stringify({ error: "Invalid amount. Must be a positive number of sats." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // GraphQL mutation to create a Lightning invoice on the Blink wallet
      // This uses the LnInvoiceCreateOnBehalfOf mutation for BTC wallets
      const mutation = `
        mutation LnInvoiceCreate($input: LnInvoiceCreateOnBehalfOfRecipientInput!) {
          lnInvoiceCreateOnBehalfOfRecipient(input: $input) {
            invoice {
              paymentHash
              paymentRequest
              paymentSecret
              satoshis
            }
            errors {
              message
            }
          }
        }
      `;

      const variables = {
        input: {
          recipientWalletId: BLINK_WALLET_ID,
          amount: Math.round(amount), // Amount in satoshis
          memo: memo || `BITLOT Parking - ${amount} sats`,
        },
      };

      console.log("Creating Blink invoice for", amount, "sats");

      const response = await fetch(BLINK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": BLINK_API_KEY,
        },
        body: JSON.stringify({ query: mutation, variables }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Blink API error [${response.status}]: ${JSON.stringify(data)}`);
      }

      // Check for GraphQL-level errors
      const result = data.data?.lnInvoiceCreateOnBehalfOfRecipient;
      if (!result || result.errors?.length > 0) {
        const errorMsg = result?.errors?.[0]?.message || "Unknown Blink API error";
        throw new Error(`Blink invoice creation failed: ${errorMsg}`);
      }

      // Return the invoice details to the frontend
      return new Response(
        JSON.stringify({
          success: true,
          invoice: {
            paymentHash: result.invoice.paymentHash,
            paymentRequest: result.invoice.paymentRequest, // This is the Lightning invoice string
            satoshis: result.invoice.satoshis,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // ACTION: Check payment status of an invoice
    // ==========================================
    if (action === "check_invoice") {
      if (!paymentHash) {
        return new Response(
          JSON.stringify({ error: "paymentHash is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Query the invoice status using the payment hash
      const query = `
        query LnInvoicePaymentStatus($input: LnInvoicePaymentStatusInput!) {
          lnInvoicePaymentStatus(input: $input) {
            status
            errors {
              message
            }
          }
        }
      `;

      const variables = {
        input: { paymentHash },
      };

      const response = await fetch(BLINK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": BLINK_API_KEY,
        },
        body: JSON.stringify({ query, variables }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Blink API error [${response.status}]: ${JSON.stringify(data)}`);
      }

      const result = data.data?.lnInvoicePaymentStatus;
      if (!result || result.errors?.length > 0) {
        const errorMsg = result?.errors?.[0]?.message || "Unknown error checking status";
        throw new Error(`Blink status check failed: ${errorMsg}`);
      }

      // Status can be: "PENDING", "PAID", "EXPIRED"
      return new Response(
        JSON.stringify({
          success: true,
          status: result.status, // "PENDING" | "PAID" | "EXPIRED"
          isPaid: result.status === "PAID",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unknown action
    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}. Use "create_invoice" or "check_invoice".` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Blink edge function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
