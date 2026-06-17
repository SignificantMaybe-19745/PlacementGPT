import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Brain,
  CalendarDays,
  CheckCircle2,
  Copy,
  FileText,
  Layers3,
  Sparkles,
  Wand2,
} from "lucide-react";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Resource {
  id: string;
  company: string;
  role?: string | null;
  candidate?: string | null;
  title: string;
  content: string;
  sourceFile: string;
  createdAt: string;
}

function extractSectionHeadings(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace(/^##\s+/, ""))
    .filter(Boolean);
}

function estimateWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/70 shadow-xl">
      <div className="border-b border-border/60 bg-gradient-to-r from-primary/8 via-transparent to-cyan-500/8 px-6 py-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-primary" />
          Interview narrative
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Clean markdown rendering with preserved chronology and structure.
        </p>
      </div>

      <div className="px-5 py-6 sm:px-7">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="mb-5 mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="mt-10 border-b border-border/60 pb-3 text-2xl font-semibold tracking-tight">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="mt-8 text-xl font-semibold tracking-tight">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="my-4 text-[15px] leading-8 text-foreground/90">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="my-4 list-disc space-y-2 pl-6 text-[15px] leading-8 text-foreground/90">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="my-4 list-decimal space-y-2 pl-6 text-[15px] leading-8 text-foreground/90">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="pl-1">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="my-6 rounded-2xl border-l-4 border-primary bg-primary/5 px-5 py-4 text-[15px] leading-8 text-foreground/90">
                {children}
              </blockquote>
            ),
            a: ({ children, href }) => (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {children}
              </a>
            ),
            code: ({ className, children }) => {
              const isBlock = className?.includes("language-");

              if (!isBlock) {
                return (
                  <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
                    {children}
                  </code>
                );
              }

              return (
                <pre className="my-6 overflow-x-auto rounded-2xl bg-zinc-950 p-5 text-sm text-zinc-100 shadow-lg">
                  <code className={className}>{children}</code>
                </pre>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default function InterviewPage() {
  const router = useRouter();
  const { id } = router.query;

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    async function loadInterview() {
      setLoading(true);
      setResource(null);
      setSummary("");
      setSummaryError("");
      setCopied(false);

      try {
        const res = await fetch(`/api/interview/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setResource(null);
          return;
        }

        setResource(data);
      } catch (error) {
        console.error(error);
        setResource(null);
      } finally {
        setLoading(false);
      }
    }

    loadInterview();
  }, [id]);

  const sectionHeadings = useMemo(() => {
    if (!resource?.content) return [];
    return extractSectionHeadings(resource.content);
  }, [resource?.content]);

  const wordCount = useMemo(() => {
    if (!resource?.content) return 0;
    return estimateWordCount(resource.content);
  }, [resource?.content]);

  async function generateSummary() {
    if (!resource?.id) return;

    setSummaryLoading(true);
    setSummaryError("");

    try {
      const res = await fetch(`/api/interview/${resource.id}/summary`);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate summary");
      }

      setSummary(data.summary ?? "");

      setTimeout(() => {
        document
          .getElementById("ai-summary-card")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (error: any) {
      setSummaryError(error?.message || "Failed to generate summary");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function copyMarkdown() {
    if (!resource?.content) return;
    await navigator.clipboard.writeText(resource.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 h-8 w-40 animate-pulse rounded-full bg-muted" />
          <div className="grid gap-8 lg:grid-cols-[1.7fr_0.8fr]">
            <div className="space-y-4">
              <div className="h-40 animate-pulse rounded-3xl bg-muted" />
              <div className="h-[700px] animate-pulse rounded-3xl bg-muted" />
            </div>
            <div className="space-y-4">
              <div className="h-52 animate-pulse rounded-3xl bg-muted" />
              <div className="h-72 animate-pulse rounded-3xl bg-muted" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!resource) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to search
          </Link>

          <Card className="border-border/60 bg-card/70">
            <CardContent className="p-8">
              <div className="text-lg font-semibold">Interview not found.</div>
              <p className="mt-2 text-sm text-muted-foreground">
                The record may have been deleted or the id is invalid.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to search
          </Link>

          <Badge variant="outline" className="rounded-full px-3 py-1">
            Semantic + hybrid indexed
          </Badge>
        </div>

        {(summaryLoading || summaryError || summary) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-8"
          >
            {summaryLoading ? (
              <Card className="border-border/60 bg-card/80 shadow-xl backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Generating AI summary...
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ) : summaryError ? (
              <Card className="border-red-500/20 bg-red-500/5 shadow-xl">
                <CardContent className="p-5 text-sm text-red-600">
                  {summaryError}
                </CardContent>
              </Card>
            ) : summary ? (
              <Card
                id="ai-summary-card"
                className="border-border/60 bg-card/80 shadow-2xl backdrop-blur"
              >
                <div className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-transparent to-cyan-500/10 px-6 py-5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Brain className="h-4 w-4 text-primary" />
                    AI Summary
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Grounded summary generated from this interview only.
                  </p>
                </div>

                <CardContent className="p-6">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {summary}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="grid gap-8 lg:grid-cols-[1.7fr_0.8fr]"
        >
          <div className="space-y-8">
            <Card className="overflow-hidden border-border/60 bg-card/75 shadow-2xl backdrop-blur">
              <div className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-transparent to-cyan-500/10 px-6 py-5 sm:px-8">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full px-3 py-1">
                    {resource.company}
                  </Badge>
                  {resource.role ? (
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {resource.role}
                    </Badge>
                  ) : null}
                  <Badge
                    variant="secondary"
                    className="rounded-full px-3 py-1"
                  >
                    Indexed
                  </Badge>
                </div>

                <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
                  {resource.title}
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {resource.candidate ? (
                    <span>Candidate: {resource.candidate}</span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(resource.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 px-6 py-5 sm:grid-cols-3 sm:px-8">
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Words
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{wordCount}</div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Sections
                  </div>
                  <div className="mt-2 text-2xl font-semibold">
                    {sectionHeadings.length}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Source
                  </div>
                  <div className="mt-2 truncate text-sm font-medium">
                    {resource.sourceFile.split("/").pop()}
                  </div>
                </div>
              </div>
            </Card>

            <MarkdownRenderer content={resource.content.trim()} />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
            <Card className="overflow-hidden border-border/60 bg-card/80 shadow-xl backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wand2 className="h-4 w-4 text-primary" />
                  Quick actions
                </div>

                <div className="mt-4 grid gap-3">
                  <Button
                    onClick={copyMarkdown}
                    variant="secondary"
                    className="justify-start rounded-2xl"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copied ? "Copied!" : "Copy markdown"}
                  </Button>

                  <Button
                    onClick={generateSummary}
                    variant="outline"
                    className="justify-start rounded-2xl"
                    disabled={summaryLoading}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {summaryLoading
                      ? "Generating..."
                      : summary
                      ? "Regenerate AI summary"
                      : "Generate AI summary"}
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="justify-start rounded-2xl"
                  >
                    <Link href="/">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Search more interviews
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80 shadow-xl backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Layers3 className="h-4 w-4 text-primary" />
                  Sections detected
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {sectionHeadings.length > 0 ? (
                    sectionHeadings.map((section) => (
                      <Badge
                        key={section}
                        variant="outline"
                        className="rounded-full px-3 py-1"
                      >
                        {section}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No section headings were detected in this document.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80 shadow-xl backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Source details
                </div>

                <dl className="mt-4 space-y-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Source file</dt>
                    <dd className="mt-1 break-all font-medium">
                      {resource.sourceFile}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Candidate</dt>
                    <dd className="mt-1 font-medium">
                      {resource.candidate || "Unknown"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Role</dt>
                    <dd className="mt-1 font-medium">
                      {resource.role || "Unknown"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </aside>
        </motion.div>
      </div>
    </main>
  );
}