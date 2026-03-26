/**
 * BITLOT - Blink Lightning Invoice Edge Function
 *
 * Creates a Lightning Network invoice via the Blink wallet GraphQL API.
 * Supports two actions:
 *   1. "create_invoice" — generates a new Lightning invoice for a given amount in sats
 *   2. "check_invoice" — checks the payment status of an existing invoice
 *
 * This version validates the configured wallet and can auto-fall back to the
 * account's BTC wallet if the saved wallet id is missing or incorrect.
 * Blink API Docs: https://dev.blink.sv/
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BLINK_API_URL = "https://api.blink.sv/graphql";
const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };

type BlinkGraphQLError = { message?: string };
type BlinkWallet = { id: string; walletCurrency?: string | null };

async function callBlink<T>(
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(BLINK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`Blink API error [${response.status}]: ${JSON.stringify(payload)}`);
  }

  if (payload.errors?.length) {
    const message = payload.errors[0]?.message || "Unknown GraphQL error";
    throw new Error(`Blink GraphQL error: ${message}`);
  }

  return payload as T;
}

async function resolveRecipientWalletId(
  apiKey: string,
  configuredWalletId?: string | null,
): Promise<string> {
  const query = `
    query ResolveWallets {
      me {
        defaultAccount {
          wallets {
            id
            walletCurrency
          }
        }
      }
    }
  `;

  const payload = await callBlink<{
    data?: {
      me?: {
        defaultAccount?: {
          wallets?: BlinkWallet[];
        };
      };
    };
  }>(apiKey, query);

  const wallets = payload.data?.me?.defaultAccount?.wallets ?? [];
  const btcWallet = wallets.find((wallet) => wallet.walletCurrency === "BTC");

  if (!btcWallet) {
    throw new Error(
      "No BTC wallet was found in your Blink account. Please create or enable a BTC wallet in Blink.",
    );
  }

  if (!configuredWalletId) {
    console.warn("BLINK_WALLET_ID is missing; using detected BTC wallet", btcWallet.id);
    return btcWallet.id;
  }

  const configuredWallet = wallets.find((wallet) => wallet.id === configuredWalletId);

  if (!configuredWallet) {
    console.warn(
      "Configured BLINK_WALLET_ID was not found in Blink account; falling back to detected BTC wallet",
      configuredWalletId,
    );
    return btcWallet.id;
  }

  if (configuredWallet.walletCurrency !== "BTC") {
    console.warn(
      "Configured BLINK_WALLET_ID is not a BTC wallet; falling back to detected BTC wallet",
      configuredWalletId,
    );
    return btcWallet.id;
  }

  return configuredWallet.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const BLINK_API_KEY = Deno.env.get("BLINK_API_KEY");
    if (!BLINK_API_KEY) {
      throw new Error("BLINK_API_KEY is not configured");
    }

    const BLINK_WALLET_ID = Deno.env.get("BLINK_WALLET_ID");
    const { action, amount, paymentHash, memo } = await req.json();

    if (action === "create_invoice") {
      if (!amount || amount <= 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid amount. Must be a positive number of sats." }),
          { status: 400, headers: JSON_HEADERS },
        );
      }

      const recipientWalletId = await resolveRecipientWalletId(BLINK_API_KEY, BLINK_WALLET_ID);

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

      const payload = await callBlink<{
        data?: {
          lnInvoiceCreateOnBehalfOfRecipient?: {
            invoice?: {
              paymentHash: string;
              paymentRequest: string;
              paymentSecret?: string;
              satoshis: number;
            };
            errors?: BlinkGraphQLError[];
          };
        };
      }>(BLINK_API_KEY, mutation, {
        input: {
          recipientWalletId,
          amount: Math.round(amount),
          memo: memo || `BITLOT Parking - ${amount} sats`,
        },
      });

      const result = payload.data?.lnInvoiceCreateOnBehalfOfRecipient;
      if (!result || result.errors?.length || !result.invoice) {
        const errorMsg = result?.errors?.[0]?.message || "Unknown Blink API error";
        throw new Error(`Blink invoice creation failed: ${errorMsg}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          invoice: {
            paymentHash: result.invoice.paymentHash,
            paymentRequest: result.invoice.paymentRequest,
            satoshis: result.invoice.satoshis,
          },
        }),
        { status: 200, headers: JSON_HEADERS },
      );
    }

    if (action === "check_invoice") {
      if (!paymentHash) {
        return new Response(
          JSON.stringify({ success: false, error: "paymentHash is required" }),
          { status: 400, headers: JSON_HEADERS },
        );
      }

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

      const payload = await callBlink<{
        data?: {
          lnInvoicePaymentStatus?: {
            status?: "PENDING" | "PAID" | "EXPIRED";
            errors?: BlinkGraphQLError[];
          };
        };
      }>(BLINK_API_KEY, query, {
        input: { paymentHash },
      });

      const result = payload.data?.lnInvoicePaymentStatus;
      if (!result || result.errors?.length || !result.status) {
        const errorMsg = result?.errors?.[0]?.message || "Unknown error checking status";
        throw new Error(`Blink status check failed: ${errorMsg}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: result.status,
          isPaid: result.status === "PAID",
        }),
        { status: 200, headers: JSON_HEADERS },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}. Use "create_invoice" or "check_invoice".` }),
      { status: 400, headers: JSON_HEADERS },
    );
  } catch (error: unknown) {
    console.error("Blink edge function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
});