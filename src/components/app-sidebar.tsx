"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  ListTodo,
  Users,
  Mic2,
  MessageSquare,
  BarChart3,
  CalendarDays,
  LogOut,
  Menu,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/footer";

type UserRole = "candidate" | "mentor" | "admin" | "visitor";

interface AppSidebarProps {
  role: UserRole;
  fullName?: string;
  children: React.ReactNode;
}

const candidateLinks = [
  { href: "/", label: "הפורטל שלי", icon: LayoutDashboard },
  { href: "/tasks", label: "משימות", icon: ListTodo },
];

const mentorLinks = [
  { href: "/", label: "הפורטל שלי", icon: LayoutDashboard },
  { href: "/sessions/new", label: "פגישות", icon: CalendarDays },
];

const visitorLinks = [
  { href: "/", label: "הרצאות", icon: Mic2 },
];

const adminLinks = [
  { href: "/admin", label: "סקירה", icon: BarChart3 },
  { href: "/admin/users", label: "משתמשים", icon: Users },
  { href: "/admin/lectures", label: "הרצאות", icon: Mic2 },
  { href: "/admin/feedback", label: "משובים", icon: MessageSquare },
  { href: "/admin/checkins", label: "צ׳ק-אין", icon: ClipboardCheck },
];

function getLinks(role: UserRole) {
  switch (role) {
    case "candidate":
      return candidateLinks;
    case "mentor":
      return mentorLinks;
    case "visitor":
      return visitorLinks;
    case "admin":
      return adminLinks;
  }
}

function getRoleLabel(role: UserRole) {
  switch (role) {
    case "candidate":
      return "יזם/ת";
    case "mentor":
      return "מנטור/ית";
    case "visitor":
      return "מאזין/ת";
    case "admin":
      return "מנהל/ת";
  }
}

export function AppSidebarLayout({ role, fullName, children }: AppSidebarProps) {
  const pathname = usePathname();
  const links = getLinks(role);

  return (
    <SidebarProvider>
      <Sidebar
        side="right"
        collapsible="offcanvas"
        className="border-l-0"
      >
        {/* Header with logo */}
        <SidebarHeader className="px-4 py-5">
          <div className="flex items-center" dir="ltr">
            <img
              src="/logo.png"
              alt="OfekTech"
              className="h-9 w-auto object-contain"
            />
          </div>
          {fullName && (
            <div className="mt-3 px-1">
              <p className="text-sm font-medium text-sidebar-foreground">
                {fullName}
              </p>
              <p className="text-xs text-sidebar-foreground/60">
                {getRoleLabel(role)}
              </p>
            </div>
          )}
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>ניווט</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {links.map((link) => {
                  const isActive =
                    link.href === "/"
                      ? pathname === "/"
                      : pathname === link.href || pathname.startsWith(link.href + "/");
                  return (
                    <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={link.label}
                        render={<Link href={link.href} />}
                        className={cn(
                          "text-right",
                          isActive &&
                            "bg-[#22c55e]/10 text-[#22c55e] font-semibold hover:bg-[#22c55e]/15 hover:text-[#22c55e]"
                        )}
                      >
                        <link.icon className="size-4" />
                        <span>{link.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer with logout */}
        <SidebarFooter className="px-4 py-4 border-t border-sidebar-border">
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <LogOut className="size-4" />
              <span>התנתקות</span>
            </button>
          </form>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col min-h-screen">
        {/* Mobile header with trigger */}
        <header className="flex items-center gap-2 border-b px-4 py-3 md:hidden">
          <SidebarTrigger>
            <Menu className="size-5" />
          </SidebarTrigger>
          <img src="/logo.png" alt="OfekTech" className="h-7 w-auto" />
        </header>
        <div className="flex-1">{children}</div>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
