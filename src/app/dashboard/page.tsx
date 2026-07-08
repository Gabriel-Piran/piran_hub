import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { LeadsFunnel } from "@/components/dashboard/LeadsFunnel";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { LeadsChart } from "@/components/dashboard/LeadsChart";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <ErrorBoundary label="as métricas">
        <MetricsCards />
      </ErrorBoundary>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-[60%]">
          <ErrorBoundary label="o funil de leads">
            <LeadsFunnel />
          </ErrorBoundary>
        </div>
        <div className="lg:w-[40%]">
          <ErrorBoundary label="a atividade recente">
            <RecentActivity />
          </ErrorBoundary>
        </div>
      </div>

      <ErrorBoundary label="o gráfico de leads">
        <LeadsChart />
      </ErrorBoundary>
    </div>
  );
}
