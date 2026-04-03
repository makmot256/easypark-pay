import { useMemo, useState } from "react";
import { askAIAssistant, type ChatMessage } from "@/lib/ai-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const AIAssistant = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello. I am your BITLOT assistant. Ask me anything about tickets, Blink payments, or parking workflow.",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);

  const canSend = useMemo(
    () => question.trim().length > 0 && !isSending,
    [question, isSending],
  );

  const handleSend = async () => {
    const trimmed = question.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const outgoingMessages = [...messages, userMessage];

    setMessages(outgoingMessages);
    setQuestion("");
    setIsSending(true);

    const result = await askAIAssistant(outgoingMessages);

    if (!result.success) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I could not answer right now: ${result.error || "Unknown error"}`,
        },
      ]);
      setIsSending(false);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: result.response || "I could not generate a response.",
      },
    ]);
    setIsSending(false);
  };

  return (
    <Card className="glow-border">
      <CardHeader>
        <CardTitle className="text-primary">AI Assistant</CardTitle>
        <p className="text-sm text-muted-foreground">
          Ask questions about parking workflow, ticket issues, and payment
          support.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border bg-secondary/40 p-3 space-y-3">
          {messages.map((message, idx) => (
            <div
              key={`${message.role}-${idx}`}
              className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                message.role === "user"
                  ? "ml-8 bg-primary text-primary-foreground"
                  : "mr-8 bg-background border border-border"
              }`}
            >
              {message.content}
            </div>
          ))}

          {isSending && (
            <div className="mr-8 bg-background border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground">
              Assistant is thinking...
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question..."
            className="min-h-[100px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Press Ctrl+Enter to send quickly.
            </p>
            <Button onClick={() => void handleSend()} disabled={!canSend}>
              {isSending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIAssistant;
