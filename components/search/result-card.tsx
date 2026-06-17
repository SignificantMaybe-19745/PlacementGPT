import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ResultCardProps {
  result: {
    id: string;
    company: string;
    role?: string | null;
    candidate?: string | null;
    title: string;
    content: string;
    createdAt: string;
    hybridScore?: number;
  };
}

export function ResultCard({ result }: ResultCardProps) {
  const snippet = result.content.replace(/\s+/g, " ").trim().slice(0, 240);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Link href={`/interview/${result.id}`} className="block">
        <Card className="overflow-hidden border-border/60 bg-card/80 shadow-lg transition-shadow hover:shadow-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="rounded-full px-3 py-1 font-medium"
                  >
                    {result.company}
                  </Badge>

                  {result.role ? (
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {result.role}
                    </Badge>
                  ) : null}

                  {typeof result.hybridScore === "number" ? (
                    <Badge className="rounded-full px-3 py-1">
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      Match {result.hybridScore.toFixed(2)}
                    </Badge>
                  ) : null}
                </div>

                <h3 className="text-2xl font-semibold tracking-tight">
                  {result.title}
                </h3>

                {result.candidate ? (
                  <p className="text-sm text-muted-foreground">
                    Candidate: {result.candidate}
                  </p>
                ) : null}
              </div>

              <ArrowUpRight className="mt-1 h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>

            <p className="mt-5 line-clamp-4 text-sm leading-6 text-muted-foreground">
              {snippet}
            </p>

            <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <span>Added {new Date(result.createdAt).toLocaleDateString()}</span>
              <span className="font-medium text-foreground/80">
                Open interview →
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}