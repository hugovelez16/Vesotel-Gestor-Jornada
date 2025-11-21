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
  Shield,
  Clock,
  LogOut,
  Settings,
  Users,
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

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendario", icon: Calendar },
  { href: "/list", label: "Lista", icon: List },
];

const adminNavItems = [
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/timeline", label: "Timeline", icon: Clock },
];

export default function MainNav() {
  const { user } = useUser();
  const auth = useFirebaseAuth();
  const pathname = usePathname();

  const isAdmin = user?.email === ADMIN_EMAIL;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  const logout = () => {
    signOut(auth);
  }

  const NavLinks = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {[...navItems, ...(isAdmin ? adminNavItems : [])].map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isMobile ? "flex-col justify-center text-xs h-14" : "",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", isMobile ? "h-6 w-6" : "")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Desktop Nav */}
      <header className="sticky top-0 z-50 hidden w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <VesotelLogo />
          </Link>
          <nav className="flex items-center gap-4 text-sm lg:gap-6">
            <NavLinks />
          </nav>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL ?? ""} alt={user?.displayName ?? ""} />
                    <AvatarFallback>{user?.displayName ? getInitials(user.displayName) : 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
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
        </div>
      </header>

      {/* Mobile Nav */}
      <footer className="fixed bottom-0 z-50 w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <nav className="grid h-16 grid-cols-5 items-center justify-around gap-1 px-2">
          <NavLinks isMobile />
           <Link
            href="/profile"
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors h-14 text-xs",
              pathname === '/profile'
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <User className="h-6 w-6" />
            <span>Perfil</span>
          </Link>
        </nav>
      </footer>
    </>
  );
}
