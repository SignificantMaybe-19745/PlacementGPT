import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/layout/site-header";
import { SearchBar } from "@/components/search/search-bar";
import { ResultCard } from "@/components/search/result-card";
import { ResultSkeleton } from "@/components/search/result-skeleton";
import { EmptyState } from "@/components/search/empty-state";
import { SearchFilters } from "@/components/search/search-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import {
  BrainCircuit,
  Rocket,
  Sparkles,
  Wand2,
  ArrowRight,
  Search as SearchIcon,
} from "lucide-react";

type SearchResult = {
  id: string;
  company: string;
  role?: string | null;
  candidate?: string | null;
  title: string;
  content: string;
  createdAt: string;
  hybridScore?: number;
};

const quickSearches = [
  "PhonePe",
  "JPMC",
  "UBS",
  "system design",
  "DP",
  "LRU cache",
];

const quickQuestions = [
  "What should I prepare for PhonePe?",
  "Which companies asked system design?",
  "What DSA topics appear most often?",
  "Show interviews mentioning DP or graphs.",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyFilter, setCompanyFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&limit=20`
        );
        const data = await res.json();
        setResults(data.results ?? data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      const companyOk =
        !companyFilter ||
        result.company.toLowerCase().includes(companyFilter.toLowerCase());

      const roleOk =
        !roleFilter ||
        (result.role ?? "").toLowerCase().includes(roleFilter.toLowerCase());

      return companyOk && roleOk;
    });
  }, [results, companyFilter, roleFilter]);

  async function handleAskAI(e: React.FormEvent) {
    e.preventDefault();

    if (!question.trim()) return;

    setChatLoading(true);
    setChatError("");
    setAnswer("");
    setSources([]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Chat request failed");
      }

      const raw = data.answer ?? "";
      const cleaned = String(raw).replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

      setAnswer(cleaned);
      setSources(data.sources ?? []);
    } catch (err: any) {
      setChatError(err?.message || "Failed to generate answer.");
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="relative mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-5xl"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card/70 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>400+ interview experiences indexed</span>
          </div>

          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Search real placement interviews.
            <span className="block text-muted-foreground">
              Ask AI what to prepare next.
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Find company-specific rounds, coding questions, HR experiences, and
            prep patterns across a growing corpus of real interview experiences.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            {quickSearches.map((item) => (
              <button
                key={item}
                onClick={() => setQuery(item)}
                className="rounded-full border bg-card/60 px-4 py-2 text-sm text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:text-foreground"
              >
                {item}
              </button>
            ))}
          </div>
        </motion.section>

        <div className="mt-10 grid gap-8 xl:grid-cols-[1.65fr_1fr]">
          <motion.section
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="space-y-6"
          >
            <Card className="border-border/60 bg-card/70 shadow-xl backdrop-blur">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <SearchIcon className="h-4 w-4 text-primary" />
                    Hybrid search — keyword + semantic ranking
                  </div>

                  {query.trim() ? (
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      {loading
                        ? "Searching..."
                        : `${filteredResults.length} result${
                            filteredResults.length === 1 ? "" : "s"
                          }`}
                    </Badge>
                  ) : null}
                </div>

                <SearchBar value={query} onChange={setQuery} />

                <SearchFilters
                  company={companyFilter}
                  setCompany={setCompanyFilter}
                  role={roleFilter}
                  setRole={setRoleFilter}
                />
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <ResultSkeleton key={i} />
                ))
              ) : filteredResults.length > 0 ? (
                filteredResults.map((result) => (
                  <ResultCard key={result.id} result={result} />
                ))
              ) : query.trim() ? (
                <EmptyState />
              ) : (
                <Card className="border-dashed bg-card/40">
                  <CardContent className="p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Rocket className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">
                      Start with a company, topic, or keyword
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Try PhonePe, JPMC, DP, graphs, LRU cache, or system
                      design.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="space-y-6 xl:sticky xl:top-24 h-fit"
          >
            <Card className="overflow-hidden border-border/60 bg-card/80 shadow-xl backdrop-blur">
              <div className="border-b bg-gradient-to-r from-primary/10 via-transparent to-cyan-500/10 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <BrainCircuit className="h-4 w-4 text-primary" />
                  Ask AI across the corpus
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Grounded answers from the top relevant interviews.
                </p>
              </div>

              <CardContent className="p-5">
                <form onSubmit={handleAskAI} className="space-y-4">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What should I prepare for PhonePe?"
                    className="min-h-[140px] w-full rounded-2xl border border-border/60 bg-background/90 p-4 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />

                  <div className="flex flex-wrap gap-2">
                    {quickQuestions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setQuestion(item)}
                        className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <Button
                    type="submit"
                    className="h-11 w-full rounded-2xl"
                    disabled={chatLoading}
                  >
                    {chatLoading ? "Thinking..." : "Generate answer"}
                    {!chatLoading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {chatError ? (
              <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="p-4 text-sm text-red-600">
                  {chatError}
                </CardContent>
              </Card>
            ) : null}

            <Card className="border-border/60 bg-card/80 shadow-xl backdrop-blur">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Wand2 className="h-4 w-4 text-primary" />
                  AI answer
                </div>

                {chatLoading ? (
                  <div className="space-y-3">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  </div>
                ) : answer ? (
  <div className="space-y-4">
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/70">
      <div className="overflow-x-auto p-4">
        <div className="prose prose-sm max-w-none dark:prose-invert
                        prose-table:min-w-full
                        prose-table:border-collapse
                        prose-th:border prose-th:border-border/60 prose-th:bg-muted prose-th:px-3 prose-th:py-2 prose-th:text-left
                        prose-td:border prose-td:border-border/60 prose-td:px-3 prose-td:py-2
                        prose-img:rounded-xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {answer}
          </ReactMarkdown>
        </div>
      </div>
    </div>

    {sources.length > 0 ? (
      <div className="pt-4">
        <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Sources used
        </div>
        <div className="space-y-3">
          {sources.slice(0, 3).map((src) => (
            <a
              key={src.id}
              href={`/interview/${src.id}`}
              className="block rounded-2xl border border-border/60 bg-background/70 p-3 transition hover:border-primary/30 hover:bg-background"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{src.company}</div>
                  <div className="text-xs text-muted-foreground">{src.title}</div>
                </div>
                <Badge variant="outline" className="rounded-full">
                  Open
                </Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {(src.content ?? "").replace(/\s+/g, " ").trim().slice(0, 160)}
              </p>
            </a>
          ))}
        </div>
      </div>
    ) : null}
  </div>
) : (
  <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
    Ask a question and I will pull the most relevant interview experiences, then synthesize an answer from them.
  </div>
)}
              </CardContent>
            </Card>
          </motion.aside>
        </div>
      </main>
    </div>
  );
}