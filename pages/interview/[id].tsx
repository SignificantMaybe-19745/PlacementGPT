import { useRouter } from "next/router";

export default function InterviewPage() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <button
        onClick={() => router.back()}
        className="mb-8 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Search
      </button>

      <h1 className="text-4xl font-bold">
        Interview {id}
      </h1>

      <p className="mt-4 text-muted-foreground">
        We'll load the full interview details here next.
      </p>
    </main>
  );
}