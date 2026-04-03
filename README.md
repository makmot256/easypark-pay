

TODO: Document your project here

## AI Assistant Setup

This app now includes an AI assistant tab backed by a Supabase edge function.

Deploy the function:

```bash
npx supabase functions deploy ai-chat
```

Set required secrets:

```bash
npx supabase secrets set OPENROUTER_API_KEY=your_openrouter_api_key
npx supabase secrets set AI_MODEL=openai/gpt-4o-mini
```

`AI_MODEL` is optional. If omitted, `openai/gpt-4o-mini` is used.
