import { Link, Outlet } from 'react-router-dom';
import { Menu, Package2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { UserNav } from '@/components/shared/UserNav';

export default function AdminLayout() {
  const navLinks = [
    { to: "/admin/services", label: "Servicios" },
    { to: "/admin/availability", label: "Disponibilidad" },
    { to: "/admin/bookings", label: "Reservas" },
  ];

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link to="/admin" className="flex items-center gap-2 font-semibold">
              <Package2 className="h-6 w-6" />
              <span>AppointMe</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>


      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden" 
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  to="#"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                >
                  <Package2 className="h-6 w-6" />
                  <span>AppointMe</span>
                </Link>
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <div className="w-full flex-1">

          </div>


          <UserNav />
        </header>


        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
}