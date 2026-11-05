# ChatGPT-like, fast chat UX for an e-commerce sales/technical assistant (TestereStore)

Research date: 2026-10-26. Sources are marked with their date where known. Material from before 2024 is labelled **[older]**.

Local context checked in the repo for this research:
- `testerestore/next.config.ts` has `output: "standalone"` and no `compress` setting, so Next.js gzip is on by default.
- `advisor/docker/entrypoint.sh` starts gunicorn with `--workers 1 --threads ${GUNICORN_THREADS:-8} --timeout 120`. There is one worker on purpose: chat sessions live in process memory (`llm/conversational_engine.py`).
- The proxy is `app/api/advisor/[...path]/route.ts`, rate-limited to 12 messages per minute per IP.
- Production runs on Dokploy, which uses Traefik as its reverse proxy.

---

## 1. Which UX features create the "ChatGPT feel", and which matter most for a sales/support assistant?

### Takeaway
For a store assistant, NN/g's 2026 study puts these first:
- suggested prompts and follow-ups as **buttons**
- **product images and cards**, not bare links
- one chat entry point that stays visible across pages and hands off to a human
- no autoscroll while an answer streams
- progressive disclosure inside the chat

Streaming with a visible "thinking" state is the base layer that makes the bot feel alive. Copy, regenerate and thumbs feedback are cheap extras that matter less for a sales bot than for a general chatbot. Saving or sharing a chat, voice input and a resizable or full-screen window are differentiators that few site bots offer.

### Cited Findings
- NN/g, "10 Guidelines for Designing Your Site's AI Chatbots" (Kenderova, Rosala, Kohler, **24 Apr 2026**), a usability study of real site bots. [NN/g](https://www.nngroup.com/articles/ai-chatbots-design-guidelines/)
  - (1) **Merge AI chat with other chat features** into one entry point that escalates to humans. Home Depot ran Magic Apron and Live Chat side by side, and that confused users.
  - (2) **Keep the chatbot available across pages.** When chat disappears between pages, users stop using it. Williams Sonoma is the positive example.
  - (3) **Use the opening message and suggested prompts to show what the bot can do.** Turo's generic "Ask me anything" failed. Williams Sonoma's "AI Sous Chef" worked because it listed concrete jobs.
  - (4) **Make suggested questions buttons, not text.** Magic Apron's buttons updated with context. Redfin made users type, which frustrated them.
  - (5) **Include images, not only links or text.** Home Depot's paint carousel with images beat expectations. Williams Sonoma's text-only mixer recommendation disappointed users: "I would have liked the option of seeing a picture."
  - (6) **Use progressive disclosure.** Expand and collapse product details in place instead of generating new messages. Rufus's "More details" link appended more text and made the conversation longer.
  - (7) **Don't autoscroll to the end of a response while it streams.** It disorients users mid-reading. Keep the scroll position at the top of the message.
  - (8) **Let users resize the chat window.** Small default windows limit rich content. Resizing was rare among the bots studied.
  - (9) **Let users save or share chat content** by download, email or sharing. A user wanted to "email it to myself" and "share it… to my daughter".
  - (10) **Consider voice input.** One participant said they would have abandoned the chat without voice-to-text, and NN/g frames it as an accessibility need.
  - NN/g's conclusion: "small design decisions had a large impact on whether people relied on chatbots for help."
- NN/g groups prompt suggestions into three types. [NN/g – Prompt Suggestions](https://www.nngroup.com/articles/prompt-suggestions/)
  - **Use-case suggestions** help users learn what the bot can do.
  - **Autocomplete suggestions** speed up typing.
  - **Follow-up-question suggestions** increase engagement. They depend on the conversation so far and appear under the last answer.
  - Follow-ups should build on the answer just given. When a user is working toward a goal, the bot should hold related suggestions until the issue is resolved, so it doesn't distract them.
- Other NN/g titles from 2025–2026 suggest a trend toward brevity and a clear purpose, but I could not fetch the bodies (HTTP 503), so treat this as signal only:
  - "Less Chat, More Answer: Site AI Chatbots Need to Get to the Point" [NN/g](https://www.nngroup.com/articles/less-chat-more-answer/)
  - "What Is Your Site's AI Chatbot for? Users Can't Tell" [NN/g](https://www.nngroup.com/articles/site-ai-chatbot/)
  - "The 5 Dimensions of Site-Specific AI Chatbots" [NN/g](https://www.nngroup.com/articles/dimensions-of-ai-chatbots/)
  - "Prompt Controls in GenAI Chatbots" [NN/g](https://www.nngroup.com/articles/prompt-controls-genai/)
- In the AI SDK 5 message model, a chat message is a list of typed **parts** (text, tool calls, tool results, custom `data-*` parts) rather than one string. That is the structure that lets a UI mix streamed text with cards. [AI SDK 5 – Vercel](https://vercel.com/blog/ai-sdk-5); [AI SDK – Chatbot Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage)
- Typing and "thinking" indicators: a 2025 virtual-agent study reports users prefer a visible typing indication over nothing while they wait. [arXiv 2507.22352](https://arxiv.org/html/2507.22352v1) (I only read the search snippet, not the full paper.)

### Inferences
Ranking of the ChatGPT-style features for TestereStore, from most to least important for a sales/technical bot:
1. **Token streaming plus an immediate "Düşünüyorum…" (thinking) state**, possibly with a status line naming the step, such as "Makine kataloğunda arıyorum…" (searching the machine catalog). The current 2–5 s blank wait breaks Nielsen's 1 s flow limit (Q2).
2. **Product cards in the chat** with image, price incl. KDV (VAT), stock and an add-to-cart or "Ürüne git" (go to product) button. NN/g's guideline 5 covers this, and so do Home Depot and Zalando (Q3).
3. **Button follow-ups.** The questionnaire quick replies already do this. Extend them to LLM-generated follow-ups, shown only after an answer is complete.
4. **Lightweight markdown.** Use bold, lists, links, and tables only for comparisons such as TPI vs. material thickness. Collapse long specs with "Detaylar ▾" (details).
5. **Human handoff** (WhatsApp, phone, or a form) inside the same widget, not a second chat bubble (NN/g guideline 1).
6. **Full-screen sheet on mobile and a resizable or expandable panel on desktop** (NN/g guideline 8).
7. **Keep the chat after navigation.** Carry it across product, cart and checkout pages, which the in-chat purchase flow already needs (NN/g guideline 2).
8. **Cheap extras:** a stop button, copy, thumbs up/down, "send this recommendation to me by e-mail" (NN/g guideline 9), and voice input through the Web Speech API (NN/g guideline 10).
9. **Regenerate and edit-and-resend matter little** for a sales bot. Deprioritize them.

Accessibility basics:
- Mark the message list as `role="log"` with `aria-live="polite"`.
- Announce only finished messages, not every token, or screen readers will chatter.
- Use Enter to send and Shift+Enter for a new line, return focus to the input after sending, and make Esc close the panel.
- These are standard WAI-ARIA practice and were not specifically sourced here.

### Gaps
- I could not read the full text of NN/g's "Less Chat, More Answer" or "Users Can't Tell" (503 errors). Their exact recommendations on answer length are not captured.
- I found no Turkish-language UX research on chat assistants (for example, formality of "siz" vs. "sen", or tolerance for long answers).
- Baymard has published nothing on AI chat specifically that I found.

---

## 2. Latency: targets, and how to make TestereStore's stack feel fast

### Takeaway
Targets:
- Show a visual acknowledgement in under 100 ms.
- Show the first text or status in under about 1 s. A practitioner heuristic sets p95 TTFT at 500 ms or less for "responsive".
- Hard-cap the full answer around 10 s, with a stop option.

GPT-4o's own TTFT is about 0.8 s (Artificial Analysis snapshot), so the current 2–5 s blank wait is mostly pipeline and orchestration time plus missing streaming.

To stream end to end on this stack, all of the following have to hold:
- Flask yields SSE.
- gunicorn has enough threads, or gevent workers.
- Next.js `compress` is off, or excludes event streams, and the route handler passes the body through.
- Traefik's compress middleware excludes `text/event-stream`.
- Headers include `Cache-Control: no-cache, no-transform` and `X-Accel-Buffering: no`.

Then:
- Order prompts for caching: static content first, dynamic content last.
- Use a small, fast model for routing and extraction.
- Answer from the deterministic front desk with no LLM wherever possible.

### Cited Findings
**Perception thresholds**
- Nielsen's limits, from 1993 and updated 2014 **[older, still canonical]**. [NN/g – Response Times](https://www.nngroup.com/articles/response-times-3-important-limits/)
  - 0.1 s is "the limit for having the user feel that the system is reacting instantaneously".
  - 1 s is "the limit for the user's flow of thought to stay uninterrupted".
  - 10 s is "the limit for keeping the user's attention focused on the dialogue".
  - Past 1 s, show that the system is working. Past 10 s, show progress and give the user a way to interrupt.
- CHI 2026 study by Tan, Messerschmidt, Yin and Nov, submitted Feb 2026. [arXiv 2604.06183](https://arxiv.org/abs/2604.06183)
  - It varied TTFT at **2, 9 and 20 s** for "Creation" and "Advice" tasks.
  - Users in the 2 s condition rated outputs **less thoughtful and useful** than those in the 9 s and 20 s conditions. Participants read the delay as the AI deliberating.
  - Long waits sometimes caused frustration or doubts about reliability.
  - The authors treat latency as "a strategic interface variable", not just a number to minimize.
- Practitioner heuristics from a blog, without primary data, so treat as rules of thumb. [TianPan.co, Apr 2026](https://tianpan.co/blog/2026/04/16/streaming-ttft-latency-perception)
  - p95 TTFT under about 500 ms feels responsive, under about 200 ms feels instant, and over about 1.5 s feels sluggish.
  - The search summary also said "users perceive streaming as 40–60% faster than non-streaming at equal total time". I could not trace that figure to a primary study, so treat it as unverified.

**Model baseline**
- Artificial Analysis measures OpenAI's API TTFT at about **0.80 s for GPT-4o (Nov '24)**, about **1.08 s for GPT-4o-mini** and about **2.99 s for GPT-4 Turbo**. These are live dashboards, the numbers drift, and I took them from search snippets. [AA – GPT-4o providers](https://artificialanalysis.ai/models/gpt-4o/providers); [AA – GPT-4o mini providers](https://artificialanalysis.ai/models/gpt-4o-mini/providers)
- Amazon Rufus (Amazon Science, **Oct 2024**) streams "token-by-token" so customers get "the first part of the answer while the rest is still in progress". [Amazon Science](https://www.amazon.science/blog/the-technology-behind-amazons-genai-powered-shopping-assistant-rufus)
  - It uses continuous batching, making "routing decisions for new requests after every token is generated".
  - It also uses custom chips (Trainium, Inferentia).
  - A later AWS post covers doubling inference speed with **parallel (speculative-style) decoding**. I read only the title. [AWS ML Blog](https://aws.amazon.com/blogs/machine-learning/how-rufus-doubled-their-inference-speed-and-handled-prime-day-traffic-with-aws-ai-chips-and-parallel-decoding/)

**Where streams get buffered, and the fixes**
- A stream that "works locally but arrives all at once in production" is almost always held up by a buffer in between. Common culprits are compression middleware, nginx `proxy_buffering`, a CDN or edge layer, or a serverless runtime. [DEV – Finding the buffer](https://dev.to/libme/token-streaming-works-locally-but-arrives-all-at-once-in-production-finding-the-buffer-1o9g)
  - "gzip needs a block of input before it emits output, so your tokens sit in the compressor."
  - Universal origin headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`.
  - nginx: `proxy_buffering off; proxy_cache off; gzip off; proxy_read_timeout 3600s;`
  - On the client, read `res.body.getReader()` in a loop instead of awaiting `res.json()`.
  - Debugging: pipe `curl -sN` through `date +%T.%N` and test the origin port, then the proxy, then the public hostname. Identical timestamps mean something is buffering.
- **Next.js standalone gzip**: in one project, the Next.js standalone server gzipped a proxied SSE response, which held back every event until the stream ended. The fix was `compress: false` in `next.config` plus `no-transform` and `x-accel-buffering` headers. [GitHub PR – ask-data #6](https://github.com/JerryHider/ask-data/pull/6)
- Route handler settings: export `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`, and return the `Response` with a stream immediately. [DEV – Next.js SSE App Router](https://dev.to/nainikmehta/nextjs-sse-reliable-server-sent-events-app-router-11al); [Medium – Fixing slow SSE in Next.js/Vercel](https://medium.com/@oyetoketoby80/fixing-slow-sse-server-sent-events-streaming-in-next-js-and-vercel-99f42fbdb996)
- **Traefik**
  - Go's reverse proxy, which Traefik uses, flushes `Content-Type: text/event-stream` responses immediately rather than on an interval. [server-sent-events.com – Caddy & Traefik](https://www.server-sent-events.com/sse-protocol-fundamentals-architecture/proxy-and-cdn-configuration-for-sse/configuring-caddy-and-traefik-for-sse/)
  - The **compress middleware has buffered SSE**, with a regression in v3.x. Upstream fix: [Traefik PR #11511](https://github.com/traefik/traefik/pull/11511). Related issue: [#7882](https://github.com/traefik/traefik/issues/7882).
  - Coolify, a Dokploy-like PaaS, now generates a `gzip-sse` compress middleware with `excludedcontenttypes=text/event-stream` (merged **19 Oct 2026**). [Coolify PR #12229](https://github.com/coollabsio/coolify/pull/12229)
- **gunicorn**
  - The sync worker serves one request per worker and needs a buffering proxy. gthread runs a thread pool per worker for "mixed workloads, moderate concurrency". gevent is greenlet-based for streaming, long-polling and WebSockets.
  - Use async workers for "long blocking calls (external APIs…)" and streaming bodies. Workers ≈ (2 × cores) + 1, and "4–12 workers" handle heavy traffic.
  - [Gunicorn – Design](https://gunicorn.org/design/); [Gunicorn – Deploy](https://gunicorn.org/deploy/)
  - For streaming, disable proxy buffering and use an async worker class. [Gunicorn – Deploy](https://gunicorn.org/deploy/)
  - With sync workers, every open stream ties up a worker until it ends. [server-sent-events.com – Flask](https://www.server-sent-events.com/backend-stream-generation-connection-management/python-fastapi-sse-implementation-guide/streaming-sse-from-flask/)
  - SSE does not work on Flask's development server. Flask-SSE recommends `--worker-class gevent`. [Flask-SSE](https://flask-sse.readthedocs.io/en/latest/quickstart.html)

**Prompt caching (OpenAI docs, current as of Oct 2026)** [OpenAI – Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- It cuts "time spent processing input before the response starts".
- Cached input is "discounted up to 95%". On GPT-5.6+ it costs 0.1× the uncached rate. Earlier models have their own model-specific cached rates.
- Minimum length is 1,024 input tokens on GPT-5.6+. For earlier models it varies by request settings.
- Retention on earlier models: `in_memory` lasts "around 5 to 10 minutes", and the `24h` option lasts up to 24 h. GPT-5.6+ offers 30 m (default) or 12 h, with cache writes priced above base input (1.25× and 2.5×).
- Structure: "Put stable developer instructions and shared reference material first… timestamps, user-specific content… at the end."
- Use a stable `prompt_cache_key` and keep it to "about 15 requests per minute" per key.
- The docs now cover GPT-5.x and 6.x models, so GPT-4o is no longer OpenAI's current generation.

**Smaller models**
- Zalando's assistant case study on OpenAI is titled "Boosting the customer retail experience with **GPT-4o mini**". The page returned 403, so I have only the title. [OpenAI – Zalando](https://openai.com/index/zalando/)

**Turkish language**
- On GPT-4o's `o200k_base` tokenizer, Turkish needs about **1.20× more tokens per word than English**, down from about 1.50× on older GPT-4 tokenizers. More tokens means more decode time and cost for the same meaning. [nihardaily – token cost by language](https://www.nihardaily.com/posts/llm-token-cost-by-language-we-measured-14-of-them) (blog measurement). Turkish is agglutinative, so words split into more sub-word pieces. [arXiv 2508.14292](https://arxiv.org/html/2508.14292)

### Inferences
**1) Flask/gunicorn (advisor)**
- Return `Response(stream_with_context(gen()), mimetype="text/event-stream", headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})`. The generator iterates the OpenAI stream (`stream=True`) and yields `data: {...}\n\n`.
- The current setup is one worker × 8 threads. When `threads > 1`, gunicorn uses the gthread worker; that is gunicorn's documented behaviour, but I did not re-verify it this session.
- Each streaming answer holds one thread for its full duration, about 3–10 s. Eight threads allow roughly 8 concurrent chats, including the non-chat endpoints.
- Short term: raise `GUNICORN_THREADS` to about 16–32. The work is I/O-bound waiting on OpenAI, and the GIL is released during network I/O.
- Medium term: move the in-memory sessions to Redis or SQLite so workers can scale, or switch to gevent and check that the OpenAI SDK and DB clients are greenlet-safe.
- The 120 s timeout is fine for streams.

**2) Next.js proxy (`app/api/advisor/[...path]/route.ts`)**
- Code: `const up = await fetch(ADVISOR_URL, { method: "POST", body, headers, signal: req.signal }); return new Response(up.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });`
- Passing `req.signal` means the "Durdur" (stop) button aborts the call to the advisor, and through it the OpenAI call.
- Add `export const dynamic = "force-dynamic"` and `runtime = "nodejs"`.
- Because the app uses `output: "standalone"` with the default `compress: true`, set **`compress: false`** and let Traefik compress, or verify with timestamped `curl -N` that the Next.js server does not gzip `text/event-stream`.
- Keep the 12 messages/min rate limit before the stream opens.

**3) Traefik on Dokploy**
- If a compress middleware is attached, add `excludedContentTypes: [text/event-stream]`.
- Traefik flushes `text/event-stream` immediately. Other content types, such as NDJSON or `text/plain`, are flushed on `flushInterval`, which defaults to about 100 ms per Traefik docs (not re-verified here). Use `text/event-stream`.

**4) Latency budget for TestereStore**

| Step | Target |
|---|---|
| Echo the user's message plus a typing indicator, from React state | 0 ms |
| Status event from the server ("Soruyu anlıyorum…", understanding the question) | < 300 ms |
| First answer token | < 1–1.5 s |
| Deterministic front-desk answers (shipping, price, stock), no LLM | < 300 ms total |
| Full LLM answer (keep it short) | < 6 s |

- The CHI 2026 finding suggests that for complex technical advice, a visible "thinking/analyzing" state can make a slower answer seem *more* thoughtful. Show the work ("Makinenizin ölçülerini kontrol ediyorum…", checking your machine's dimensions) instead of hiding it.

**5) Pipeline**
- Pre-LLM routing and intent classification: a regex or rules layer first, then a small model only if needed.
- Run catalog, DB and stock lookups in parallel with `asyncio.gather` or a thread pool.
- Stream text first, then emit card data parts.
- Cache answers to frequent deterministic questions (for example "kargo ne kadar?", how much is shipping) for 5–15 min.

**6) Prompt caching for GPT-4o**
- Put the system prompt, front-desk rules, TPI tables and tool schemas first and keep them byte-stable. Then put the session state, then the user message.
- Never put a timestamp at the top.
- Use one stable `prompt_cache_key`, for example `advisor-v3`.
- Run a 4o-mini (or current small model) vs. 4o A/B on answer-mapping quality before switching the phrasing model.

**7) Edge vs. server**
- The bottleneck is the Python service and OpenAI, not the edge. Keep the Node.js runtime on the same VPS. Edge runtime adds nothing here.

### Gaps
- I found no authoritative (vendor or academic) TTFT benchmark specific to the Turkish language.
- Traefik's exact default `flushInterval` behaviour for non-SSE types and the version where #11511 shipped were not verified. Check the installed Traefik version on Dokploy.
- I could not confirm whether Next.js 16's built-in compression gzips route-handler `ReadableStream` responses in standalone mode. The only evidence is one project's PR, so test it.
- I did not fetch current OpenAI model TTFT numbers for GPT-5.x small models.

---

## 3. Rich commerce responses and how leading assistants do it (cards, comparisons, deep links, handoff)

### Takeaway
Leading assistants:
- stream text and fill the answer in from live catalog data (Rufus's "hydration": the model emits layout markup or IDs, and the server fills in real product data)
- show image carousels and cards (Home Depot)
- add to cart in the conversation (Zalando)
- use customer context (Lowe's)

Reported business impact is large but self-reported and affected by who chooses to use the bot:
- Rufus users are reported to be 60% more likely to purchase, with about $10–12B in incremental annualized sales.
- Mylow users convert at 3× the rate of non-users.

Common failures:
- several separate chat entry points (Home Depot, per NN/g)
- text-only recommendations (Williams Sonoma)
- appending "more details" text instead of disclosing in place (Rufus)
- Klarna's quality drop on complex cases, which led it to bring humans back

### Cited Findings
- **Amazon Rufus** (Amazon Science, Oct 2024). [Amazon Science](https://www.amazon.science/blog/the-technology-behind-amazons-genai-powered-shopping-assistant-rufus)
  - Rufus "generates markup instructions that specify how various answer elements should be displayed". A "hydration" step populates "the streaming response with the right data" by querying internal systems.
  - Its sources are reviews, the catalog, community Q&A, and "relevant Stores APIs".
- Rufus results:
  - Jassy, on the Q3 2025 earnings call: on pace for more than **$10B in annual incremental sales**. [Yahoo Finance](https://finance.yahoo.com/news/amazon-says-ai-shopping-assistant-152500992.html)
  - Q4 2025: about **$12B** in incremental annualized sales, more than 300M customers in 2025, and engaged customers "**60% more likely to complete a purchase**". This comes from aggregators citing Amazon earnings; the primary source is the Amazon 8-K, which I did not open. [ZonGuru](https://www.zonguru.com/blog/understanding-amazon-rufus-ai); [SEC 8-K Q3 2025](https://www.sec.gov/Archives/edgar/data/1018724/000101872425000121/amzn-20250930xex991.htm)
  - Users were up 115%. [Modern Retail](https://www.modernretail.co/technology/amazon-says-its-ai-shopping-assistant-is-gaining-traction-with-rufus-users-up-115/)
- **Home Depot Magic Apron**
  - It answers product and how-to questions, gives project guides, and summarizes reviews. It takes voice, text or a photo as input. It localizes to store inventory and helps locate products, and is available in all U.S. stores through the app and QR codes.
  - It handles "millions of questions" monthly.
  - [CX Dive, 6 Oct 2026](https://www.customerexperiencedive.com/news/home-depot-lowes-ai-assistants-share-common-goal-approaches-differ/832056/); [Yahoo Finance](https://finance.yahoo.com/technology/ai/articles/home-depot-hd-brings-magic-201639149.html); [Marketplace, Mar 2025](https://www.marketplace.org/story/2025/03/11/home-improvement-stores-ai-tools-home-depot-lowes)
  - NN/g praised its contextual button suggestions and image carousels and criticized its separate Live Chat entry point. [NN/g](https://www.nngroup.com/articles/ai-chatbots-design-guidelines/)
- **Lowe's Mylow**
  - Built with OpenAI. It has fielded more than **25M questions**, and users convert at **3×** the rate of non-users.
  - It uses browsing history, past questions and completed projects to feel "like an associate who knows you personally".
  - A companion version serves store associates.
  - [CX Dive](https://www.customerexperiencedive.com/news/home-depot-lowes-ai-assistants-share-common-goal-approaches-differ/832056/); [PYMNTS 2026](https://www.pymnts.com/news/artificial-intelligence/2026/lowes-ai-assistant-turns-questions-into-sales/)
- **Walmart Sparky** plans purchases and summarizes reviews. It is part of Walmart's "super agent" strategy. [Retail Dive](https://www.retaildive.com/news/a-look-at-retails-year-of-ai-news/807946/)
- **Zalando assistant**
  - It started in 2023 on OpenAI over about 1.8M items.
  - About 6M customers used it in 2025 and about 10M in Q1 2026 alone.
  - It can **add items to the cart, go to checkout, summarize the bag** and suggest combinations.
  - The article's own title highlights a case where the bot "advises you to go to the competition", which is a grounding and scoping failure.
  - [xpert.digital](https://xpert.digital/en/when-the-ai-advises-the-competition/) (secondary source)
- **Klarna** (secondary sources; the primary is Klarna's Feb 2024 press release)
  - Month 1: 2.3M conversations, two-thirds of all service chats, the work of about 700 agents, CSAT on par with humans, and resolution time down from 11 min to under 2 min.
  - In May 2025 Klarna brought humans back and tightened AI confidence thresholds. The CEO said cost had "weighed too heavily" and quality had dropped.
  - [PromptLayer](https://blog.promptlayer.com/klarna-customer-service-from-ai-first-to-human-hybrid-balance/); [Fini](https://www.usefini.com/blog/klarna-automates-two-thirds-of-customer-service-with-ai-assistant)
- **Shopify Sidekick** is a merchant-side admin assistant, not a shopper-facing chat. It is not a model for storefront UX. [Ringly](https://www.ringly.io/blog/ai-sidekick-shopify)
- **B2B and industrial (Grainger)**
  - Grainger uses RAG over about 2M SKUs on Databricks Mosaic AI Vector Search, with 400k daily product updates.
  - It is building AI agents that help *phone service reps* in real time (product info, sentiment, next best action).
  - [ZenML LLMOps DB](https://www.zenml.io/llmops-database/enterprise-scale-rag-implementation-for-e-commerce-product-discovery); [Digital Commerce 360, Feb 2026](https://www.digitalcommerce360.com/2026/02/03/grainger-ai-data-digital-sales-q4-2025/)
  - I found nothing on public assistants at Würth or McMaster-Carr.
- **Mechanism for cards in a stream**
  - The AI SDK UI message stream supports custom `data-*` parts, for example `data: {"type":"data-weather","data":{...}}`. A frontend can render these as components next to `text-delta` parts. [AI SDK – Stream Protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol)
  - "Transient" data parts reach the client but are not added to message history. They suit status messages ("searching catalog…"). [AI SDK – Streaming Custom Data](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data)

### Inferences
**Apply Rufus-style hydration to TestereStore**
1. The LLM, or the rules engine, outputs only **product handles or variant IDs** plus reasoning text.
2. The Python service, or the Next.js proxy, looks up the **live price incl. KDV, stock and image** from Medusa.
3. It emits a `data-product` event, which the widget renders as a card with image, name, size (e.g. "3505 mm × 27 mm × 0.9, 3/4 TPI"), price, a stock badge, "Sepete ekle" (add to cart) and "Ürün sayfası" (product page).

The model never types prices, so it cannot hallucinate them. This matches the existing security work against price manipulation.

**Card types worth having**
- A product card. For hazır boy (ready-made length) blades, carry the parent product's image, which the existing subscriber already copies.
- A **comparison table** card, for example bimetal M42 vs. carbon, or TPI options.
- A "machine identified" card showing model and blade dimensions, which builds trust.
- A cart summary card before the user is sent to checkout.

**Handoff**
- Put a single "Bir uzmanla konuşun" (talk to an expert) action inside the same widget, for example a WhatsApp deep link `https://wa.me/90XXXXXXXXXX?text=<prefilled summary>`, plus phone and form options.
- Pre-fill it with the machine and blade spec already gathered.
- Trigger it automatically on low confidence, for example "machine not found", which matches the earlier fix that stopped claiming the nearest model was "bulundu" (found). This is the Klarna lesson about confidence thresholds.

**Behaviour**
- Keep in-chat checkout limited to collecting details plus cart. Payment stays on the checkout page because of 3DS, which matches Zalando's "proceed to checkout" pattern.

### Gaps
- I found no public UX teardown of how Rufus, Sparky or Zalando render cards (layout specs, number of cards per answer).
- I found no data on WhatsApp handoff rates or on Turkish e-commerce assistants. Trendyol and Hepsiburada have AI assistants, but I did not research them, so that is a candidate follow-up.
- Conversion uplift figures (Rufus 60%, Mylow 3×) are observational and self-reported. People who choose to use the bot are already more likely to buy, so these are not A/B-tested effects.

---

## 4. Conversation memory: persistence, history limits, summarization, privacy

### Takeaway
Store the canonical chat server-side under an opaque chat ID, and keep only the ID (plus an optional cached copy) in `localStorage`. Send only the latest message from the client, so the server rebuilds context. Let the stream finish server-side even if the client disconnects, so the history is saved. Retailers that use cross-session context (Lowe's Mylow) present it as a feature, which raises consent and privacy obligations.

### Cited Findings
- AI SDK persistence guidance. [AI SDK – Message Persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence)
  - Generate opaque chat IDs on the server and validate them, which prevents path traversal.
  - Persist **UI messages**, which include `id` and `createdAt`, in `onEnd`.
  - Use `prepareSendMessagesRequest` to send **only the last message**. The server loads the history.
  - Validate stored messages against current tool and data schemas (`validateUIMessages`) before reusing them.
  - Call `result.consumeStream()` without awaiting it so the response finishes and is saved even if the client disconnects.
  - Make streams resumable (`resume: true`, backed by Redis in production).
- NN/g users wanted to save, email or share chat outcomes. [NN/g](https://www.nngroup.com/articles/ai-chatbots-design-guidelines/)
- Lowe's Mylow uses browsing history, past questions and completed projects for personalization. [CX Dive](https://www.customerexperiencedive.com/news/home-depot-lowes-ai-assistants-share-common-goal-approaches-differ/832056/)
- NN/g says the chat must persist across pages or users abandon it. [NN/g](https://www.nngroup.com/articles/ai-chatbots-design-guidelines/)

### Inferences
**Today**
- Sessions live in gunicorn process memory, which forces one worker. They are lost on every redeploy and container restart, which happens with Dokploy's Stop→Deploy.

**Recommended setup**
- Store sessions in Redis or Postgres, keyed by `chatId`, with a TTL of 7–30 days for anonymous users.
- Keep `chatId` in `localStorage` (wrapped in try/catch) so the panel reopens with history after navigation or a reload.
- For logged-in customers, link the chat to the Medusa customer ID.

**History limits**
- Send the model the questionnaire's *structured slot state* (machine, blade length, width, material, TPI) plus the last about 6–10 turns. Do not send the full transcript.
- Summarize older turns into the slot state. This also keeps the prompt prefix stable, which helps caching (Q2).

**Privacy (KVKK, Turkey's data protection law)**
- Name, address and phone collected in chat are personal data. Mention this in the chat disclosure, link the aydınlatma metni (KVKK privacy notice), and don't send addresses to the LLM.
- Redact them before sending. The widget already collects these itself rather than the LLM doing it.
- Set log retention.

### Gaps
- I did not research KVKK-specific guidance on chatbot logs, or OpenAI data-retention settings for Turkey/EU. This needs a legal source.
- I found no benchmark for an optimal number of history turns in shopping assistants.

---

## 5. Measuring UX quality: metrics and A/B testing

### Takeaway
Instrument these:
- latency: TTFT and total time, p50 and p95, split by front-desk vs. LLM path
- engagement funnel: widget open, first message, add-to-cart from chat, checkout from chat, order
- resolution or containment, and handoff rate
- thumbs up/down and CSAT
- drop-off: abandoned mid-stream, or closed during the wait

Treat vendor resolution rates and "chat users convert N×" claims skeptically. Klarna shows that optimizing containment and cost can hurt quality. Use holdout A/B tests for causal conversion impact.

### Cited Findings
- **Intercom Fin**
  - Pricing is outcome-based, at **$0.99 per resolution**. [Intercom – pricing comparison](https://www.intercom.com/learning-center/ai-customer-service-agent-pricing-comparison); [Intercom blog](https://www.intercom.com/blog/from-resolutions-to-outcomes-evolving-how-fin-delivers-value/)
  - Intercom markets an average resolution rate of about 66% (Oct 2025), rising to about 76% (early 2026). A third-party analysis finds **45–53%** in documented production deployments. [CloneDesk](https://clonedesk.ai/blog/intercom-fin-limitations)
- **Klarna**: CSAT matched humans at launch, and resolution fell from 11 min to under 2 min. Quality later dropped on complex cases, which led to rehiring humans and tightening confidence thresholds (May 2025). [PromptLayer](https://blog.promptlayer.com/klarna-customer-service-from-ai-first-to-human-hybrid-balance/)
- Conversion claims: Rufus engaged users are "60% more likely to complete a purchase" [ZonGuru](https://www.zonguru.com/blog/understanding-amazon-rufus-ai), and Mylow users convert 3× [CX Dive](https://www.customerexperiencedive.com/news/home-depot-lowes-ai-assistants-share-common-goal-approaches-differ/832056/). Both are observational.
- TTFT is the latency users feel most. Track it at p95. [TianPan.co](https://tianpan.co/blog/2026/04/16/streaming-ttft-latency-perception) (practitioner blog)

### Inferences
**Event schema to log, per message, with GA4 or a server log**
- `chat_open`
- `message_sent` with `path` = front-desk, questionnaire or LLM
- `first_token_ms` and `complete_ms`, measured on the client and the server
- `stopped_by_user`
- `card_shown`, `card_click`, `add_to_cart_from_chat`
- `handoff_whatsapp`
- `thumbs` with a reason
- `machine_not_found`
- a session-level `order_id` attribution, for example a cart metadata `source=advisor`

**Quality outcomes**
- "Correct blade sold" is the real quality outcome: track returns and exchanges for chat-assisted orders and compare them with the rest.
- Weekly, review a sample of thumbs-down answers and machine-not-found cases.

**A/B tests**
- Randomize at the visitor level: streaming vs. not, cards vs. links, follow-up buttons on vs. off, 4o vs. a smaller model.
- The primary metric is chat-assisted add-to-cart per chat session. The guardrail is the thumbs-down rate.
- Traffic is small, so expect weeks per test. Use sequential testing or focus on large effects.

### Gaps
- I found no published benchmark for chat-to-order conversion in small or B2B e-commerce, or for Turkish users.
- I found no standard definition of "containment" for sales (as opposed to support) bots.

---

## 6. React/Next.js UI kits for streaming chat: adopt or hand-roll?

### Takeaway
All the main options are MIT-licensed:
- Vercel AI SDK v5 `useChat` with UI message streams
- assistant-ui (headless primitives, tight AI SDK integration)
- CopilotKit (heavier agent and app-state runtime, optional paid cloud)
- AI Elements (shadcn-based components, reportedly moving into shadcn by end of Nov 2026)

The cheapest strong path for TestereStore is to keep the hand-rolled widget's look and adopt **`useChat` from `@ai-sdk/react`**. Have the Python service emit the **AI SDK UI message stream protocol**: SSE, header `x-vercel-ai-ui-message-stream: v1`, `text-delta` and `data-product` parts. That gives stop, status, resumable streams and typed card parts without rewriting the backend in TypeScript.

### Cited Findings
- **UI message stream protocol for custom backends** [AI SDK – Stream Protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol)
  - Set header `x-vercel-ai-ui-message-stream: v1`.
  - The format is SSE with JSON events, ending in `data: [DONE]`.
  - Part types: `message-start`/`start-step`/`finish-step`, `text-start`/`text-delta`/`text-end`, `reasoning-*`, custom `data-*`, `tool-input-start`/`tool-input-delta`/`tool-input-available`, `tool-output-available`, `tool-approval-request`, `finish` and `error`.
- **AI SDK 5**
  - Typed `UIMessage` with parts. You can define your own message type with your own data, tools and metadata, shared by `createUIMessageStream` on the server and `useChat` on the client.
  - Transient data parts, and an `onData` callback.
  - [Vercel – AI SDK 5](https://vercel.com/blog/ai-sdk-5); [AI SDK – Streaming Custom Data](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data)
- Tool calls show up in `useChat` as typed tool parts, and partial tool calls can stream. [AI SDK – Chatbot Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage)
- Persistence and resume APIs: `prepareSendMessagesRequest`, `consumeStream`, `resume: true`. [AI SDK – Message Persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence)
- **Licensing and positioning**, from a 2026 roundup [DEV – Evaluated every AI chat UI library 2026](https://dev.to/alexander_lukashov/i-evaluated-every-ai-chat-ui-library-in-2026-heres-what-i-found-and-what-i-built-4p10) and [assistant-ui](https://www.assistant-ui.com/)
  - assistant-ui is MIT. It offers Radix-style headless primitives (Thread, Composer, Message), first-class streaming and tight AI SDK integration.
  - AI SDK and AI Elements are MIT. AI Elements is a shadcn/ui registry (message, conversation, prompt input, reasoning, sources).
  - CopilotKit is MIT with an optional paid cloud, and suits copilots that act on app state.
  - The roundup recommends starting with assistant-ui on React.
- AI Elements is reportedly deprecated at the end of November 2026 and moving into shadcn/ui as "shadcn AI Elements". This comes from a roundup summary, and I did not verify it on Vercel's site, so check before adopting. [DEV roundup](https://dev.to/alexander_lukashov/i-evaluated-every-ai-chat-ui-library-in-2026-heres-what-i-found-and-what-i-built-4p10)

### Inferences
**Option A, recommended: `useChat` plus the existing widget styling**
- Effort is about 2–4 days.
- The Python service streams UI-message-protocol SSE. A Flask generator emitting `data: {"type":"text-delta","id":"t1","delta":"..."}` is straightforward. The Next.js route passes the body through unchanged with the header set.
- The questionnaire quick replies become a `data-quickReplies` part, product cards become `data-product`, and status messages become transient `data-status`.
- `useChat` provides `status`, `stop()` and `regenerate()` (from AI SDK docs knowledge; confirm on the [useChat reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)).
- The deterministic front-desk answers can be sent as a single `text-delta` plus `finish`.

**Option B: assistant-ui on top of `useChat`**
- Adds polished thread, composer, scrolling and accessibility primitives, including scroll-anchoring behaviour.
- Costs a dependency and restyling effort. Worth it if the widget's scroll and markdown handling is weak.

**Option C: CopilotKit**
- Overkill. It targets in-app agents acting on app state, not a storefront sales chat.

**Option D: hand-rolled `fetch` + `getReader()` SSE parser**
- Smallest dependency footprint.
- You re-implement abort handling, reconnect logic, part typing and status states yourself. Fine if the team prefers zero new dependencies, but there is less to gain long-term.

**Markdown and tables in any option**
- Use `react-markdown` with `remark-gfm` for tables. Render incrementally and tolerate half-finished markdown while streaming.
- Sanitize links to allow only same-site and WhatsApp URLs.

### Gaps
- I did not benchmark bundle-size impact of `@ai-sdk/react` vs. assistant-ui for the storefront (it matters for Core Web Vitals on the product pages that host the widget).
- I did not verify compatibility with Next.js 16 and React 19 versions for assistant-ui or CopilotKit.
- I did not find official Python helpers for emitting the UI message stream protocol. The protocol is documented, but a Python implementation would be custom.
