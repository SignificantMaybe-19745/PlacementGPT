import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";

export default function InterviewPage() {
  const router = useRouter();
  const { id } = router.query;

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

        <div className="mt-6 rounded-2xl border bg-card p-8 shadow-sm">
          <div className="mb-3 inline-flex rounded-full border px-3 py-1 text-sm">
            Interview Experience
          </div>

          <h1 className="text-4xl font-bold tracking-tight">
            Loading interview...
          </h1>

          <p className="mt-4 text-muted-foreground">
            Interview ID: {id}
          </p>

          <div className="my-8 h-px bg-border" />

          <div className="space-y-4">
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
            <div className="h-4 w-4/6 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}