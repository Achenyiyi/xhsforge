import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import WorkspaceShell from "@/components/WorkspaceShell";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (!session || session.user.status !== "active") {
    redirect("/login");
  }

return <WorkspaceShell />;
}
