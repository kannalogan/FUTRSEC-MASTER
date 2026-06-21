import { Link } from "wouter";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
        <ShieldOff className="h-8 w-8 text-destructive" />
      </div>
      <h1 className="font-heading text-2xl font-bold mb-2">403 — Access Denied</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        You don't have permission to view this page. This area is restricted to a
        different career track or role.
      </p>
      <Link href="/dashboard">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
