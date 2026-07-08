import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Sidebar />
      <Header />
      <main className="ml-16 min-h-screen pt-16">{children}</main>
    </div>
  );
}
