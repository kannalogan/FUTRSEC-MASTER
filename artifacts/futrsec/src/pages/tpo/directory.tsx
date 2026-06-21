import { useState } from "react";
import { useTpoStudents, TRACK_LABELS, TRACK_COLORS, TRACKS, type TpoStudent } from "@/lib/tpo-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { exportToCSV } from "@/lib/export-utils";
import { Search, Users, Download } from "lucide-react";

export default function TpoDirectory() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [track, setTrack] = useState<string | null>(null);

  const { data, isLoading } = useTpoStudents({
    track: track ?? undefined,
    search: debounced || undefined,
  });
  const students = data?.students ?? [];

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebounced(search.trim());
  };

  const exportCsv = () => {
    exportToCSV<TpoStudent>(
      `student-directory-${new Date().toISOString().slice(0, 10)}`,
      [
        { key: "fullName", label: "Name" },
        { key: "email", label: "Email" },
        { key: "careerTrack", label: "Track", format: (s) => (s.careerTrack ? TRACK_LABELS[s.careerTrack] ?? s.careerTrack : "") },
        { key: "college", label: "College" },
        { key: "graduationYear", label: "Graduation Year" },
        { key: "city", label: "City" },
        { key: "ftsScore", label: "FTS" },
        { key: "isActive", label: "Status", format: (s) => (s.isActive ? "Active" : "Inactive") },
      ],
      students,
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        icon={Users}
        title="Student Directory"
        subtitle="Search and filter your students by track."
        actions={
          <Button onClick={exportCsv} disabled={students.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        }
      />

      <form onSubmit={onSearch} className="flex gap-2 mb-4 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          size="sm"
          variant={track === null ? "default" : "outline"}
          onClick={() => setTrack(null)}
        >
          All Tracks
        </Button>
        {TRACKS.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={track === t ? "default" : "outline"}
            onClick={() => setTrack(t)}
          >
            {TRACK_LABELS[t]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : students.length === 0 ? (
        <EmptyState icon={Users} title="No students found" description="Try a different search term or track filter." />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>College</TableHead>
                  <TableHead>Grad Year</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>FTS</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium whitespace-nowrap">{s.fullName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{s.email ?? "—"}</TableCell>
                    <TableCell>
                      {s.careerTrack ? (
                        <Badge
                          style={{ backgroundColor: `${TRACK_COLORS[s.careerTrack]}20`, color: TRACK_COLORS[s.careerTrack] }}
                          className="border-0"
                        >
                          {TRACK_LABELS[s.careerTrack] ?? s.careerTrack}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not set</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{s.college ?? "—"}</TableCell>
                    <TableCell>{s.graduationYear ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{s.city ?? "—"}</TableCell>
                    <TableCell className="font-medium">{s.ftsScore}</TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? "secondary" : "outline"}>
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
