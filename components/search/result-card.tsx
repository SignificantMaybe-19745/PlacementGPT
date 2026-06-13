import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface ResultCardProps {
  result: {
    id: string;
    company: string;
    title: string;
    content: string;
    createdAt: string;
  };
}

export function ResultCard({ result }: ResultCardProps) {

  return (
    <Link href={`/interview/${result.id}`} className="block">
    <Card className="group transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
      <CardContent className="p-6">
        <div className="mb-4 h-1 w-12 rounded-full bg-primary/70" />
        <div className="flex flex-col gap-3">
  <Badge
    variant="secondary"
    className="w-fit rounded-full px-3 py-1 font-medium"
  >
    {result.company}
  </Badge>

  <h3 className="text-2xl font-semibold tracking-tight">
    {result.title}
  </h3>
</div>

        <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">
          {result.content
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 220)}
        </p>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {new Date(result.createdAt).toLocaleDateString()}
          </span>

          <Link
  href={`/interview/${result.id}`}
  className="font-medium text-primary transition-all group-hover:translate-x-1"
>
  Click to read →
</Link>
        </div>
      </CardContent>
      
    </Card></Link>
  );
}