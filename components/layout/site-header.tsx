import { Sparkles } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border">
            <Sparkles className="h-4 w-4" />
          </div>

          <div>
            <h1 className="text-sm font-semibold">PlacementGPT</h1>
            <p className="text-xs text-muted-foreground">
              Placement Interview Search
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}