import {
  useEmployerOverview, useEmployerJobs,
} from "@/lib/employer-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, GridSkeleton } from "@/components/page-shell";
import { exportToCSV } from "@/lib/export-utils";
import { BarChart3, Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

const FUNNEL_COLORS = ["#8B5CF6", "#F97316", "#06B6D4", "#0EA5E9", "#22C55E"];

export default function EmployerAnalyticsPage() {
  const { data: overview, isLoading: ovLoading } = useEmployerOverview();
  const { data: jobsData, isLoading: jobsLoading } = useEmployerJobs();

  const isLoading = ovLoading || jobsLoading;

  if (isLoading || !overview || !jobsData) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <PageHeader icon={BarChart3} title="Hiring Analytics" subtitle="Track your hiring funnel and applications." />
        <GridSkeleton cols={2} rows={2} />
      </div>
    );
  }

  const jobs = jobsData.jobs ?? [];

  const funnel = [
    { stage: "Applications", value: overview.applications },
    { stage: "Shortlisted", value: overview.shortlisted },
    { stage: "Interviews", value: overview.interviews },
    { stage: "Offers", value: overview.offers },
    { stage: "Hired", value: overview.hired },
  ];

  const perJob = jobs.map((j) => ({ title: j.title, applications: j.applications }));

  const exportCSV = () => {
    exportToCSV(
      "employer-hiring-funnel",
      [
        { key: "stage", label: "Stage" },
        { key: "value", label: "Count" },
      ],
      funnel
    );
  };

  const exportJobsCSV = () => {
    exportToCSV(
      "employer-applications-per-job",
      [
        { key: "title", label: "Job" },
        { key: "applications", label: "Applications" },
      ],
      perJob
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={BarChart3}
        title="Hiring Analytics"
        subtitle="Track your hiring funnel and applications."
        actions={<Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>}
      />

      <Card className="mb-6">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-4">Hiring Funnel</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="stage" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {funnel.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Applications per Job</h3>
            <Button variant="ghost" size="sm" onClick={exportJobsCSV}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
          </div>
          {perJob.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No jobs posted yet.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perJob} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="title" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="applications" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
