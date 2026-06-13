import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";

interface Resource {
  id: string;
  company: string;
  role?: string;
  candidate?: string;
  title: string;
  content: string;
  sourceFile: string;
  createdAt: string;
}

export default function InterviewPage() {
  const router = useRouter();
  const { id } = router.query;

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    async function loadInterview() {
      try {
        const res = await fetch(`/api/interview/${id}`);
        const data = await res.json();
        setResource(data);
      } finally {
        setLoading(false);
      }
    }

    loadInterview();
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p>Loading...</p>
      </main>
    );
  }

  if (!resource) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p>Interview not found.</p>
      </main>
    );
  }

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

        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <div className="mb-4">
            <span className="rounded-full bg-secondary px-3 py-1 text-sm">
              {resource.company}
            </span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight">
            {resource.title}
          </h1>

          {resource.role && (
            <p className="mt-3 text-muted-foreground">
              Role: {resource.role}
            </p>
          )}

          {resource.candidate && (
            <p className="text-muted-foreground">
              Candidate: {resource.candidate}
            </p>
          )}

          <div className="my-8 h-px bg-border" />

          <article className="whitespace-pre-wrap break-words text-base leading-8">
            {resource.content
  .replace(/\r\n/g, "\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim()}  
          </article>
        </div>
      </div>
    </main>
  );
}