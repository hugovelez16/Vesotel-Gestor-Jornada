
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useAuth as useFirebaseAuth } from "@/firebase";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  List,
  User,
  LogOut,
  Settings,
  Users,
  Eye,
  Menu,
  X,
  Briefcase
} from "lucide-react";
import { VesotelLogo } from "./icons";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { signOut } from "firebase/auth";
import { ADMIN_EMAIL } from "@/lib/config";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/list", label: "Registros", icon: List },
  { href: "/calendar", label: "Calendario", icon: Calendar },
];

const adminNavItems = [
  { href: "/admin/users", label: "Usuarios", icon: Users },
];

export default function MainNav() {
  const { user } = useUser();
  const auth = useFirebaseAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  const logout = () => {
    signOut(auth);
  }

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    [...(isAdmin ? adminNavItems : []), ...mainNavItems].map((item) => {
      const isActive = pathname === item.href;
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClick}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-slate-500 transition-all hover:text-slate-900 hover:bg-slate-100 text-base font-medium",
            isActive && "bg-slate-100 text-slate-900"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      );
    })
  );

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-semibold md:text-base"
        >
          <Briefcase className="h-6 w-6 text-primary" />
          <span className="sr-only">Vesotel Jornada</span>
        </Link>
        <NavLinks />
      </nav>
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="#"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="sr-only">Vesotel Jornada</span>
            </Link>
            <NavLinks onClick={() => setIsMobileMenuOpen(false)} />
          </nav>
        </SheetContent>
      </Sheet>
      <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.photoURL ?? ""} alt={user?.displayName ?? ""} />
                <AvatarFallback>{user?.displayName ? getInitials(user.displayName) : 'U'}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/profile">
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Perfil y Ajustes</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
