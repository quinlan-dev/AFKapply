import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={session.user.email ?? ""} />
      <main className="flex-1 min-w-0 px-6 lg:px-10 py-8 pb-24 lg:pb-8">
        <div className="max-w-4xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
