
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Menu, X, Package2 } from 'lucide-react'; 

export default function PublicLayout() {

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Servicios', to: '/services' }, 
    { label: 'Contacto', to: '/contact' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container h-14 flex items-center justify-between">
          
          <NavLink to="/" className="flex items-center gap-2 font-bold text-lg">
            <Package2 className="h-6 w-6" />
            <span>AppointMe</span>
          </NavLink>

          
          <nav className="hidden md:flex gap-6 items-center">
            {navLinks.map((link) => (
              <NavLink key={link.label} to={link.to} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                {link.label}
              </NavLink>
            ))}
            <NavLink to="/login" className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-900">
              Admin Login
            </NavLink>
          </nav>

          
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        
        {isMenuOpen && (
          <nav className="md:hidden flex flex-col items-center gap-4 py-4 border-t">
            {navLinks.map((link) => (
              <NavLink key={link.label} to={link.to} onClick={() => setIsMenuOpen(false)} className="font-medium">
                {link.label}
              </NavLink>
            ))}
            <NavLink to="/login" onClick={() => setIsMenuOpen(false)} className="bg-gray-800 text-white px-6 py-2 rounded-md font-medium hover:bg-gray-900 w-11/12 text-center">
              Admin Login
            </NavLink>
          </nav>
        )}
      </header>

      
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Outlet /> 
      </main>

      
      <footer className="bg-white border-t">
        <div className="container mx-auto py-6 px-4 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} AppointMe. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}