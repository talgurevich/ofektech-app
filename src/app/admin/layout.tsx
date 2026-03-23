import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-6">
          <span className="font-bold text-lg">OfekTech Admin</span>
          <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
            סקירה
          </Link>
          <Link href="/admin/users" className="text-sm text-gray-600 hover:text-gray-900">
            משתמשים
          </Link>
          <Link href="/admin/lectures" className="text-sm text-gray-600 hover:text-gray-900">
            הרצאות
          </Link>
          <Link href="/admin/feedback" className="text-sm text-gray-600 hover:text-gray-900">
            משובים
          </Link>
          <Link href="/admin/checkins" className="text-sm text-gray-600 hover:text-gray-900">
            צ׳ק-אין
          </Link>
          <form action="/auth/logout" method="POST" className="mr-auto">
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">
              התנתקות
            </button>
          </form>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  );
}
