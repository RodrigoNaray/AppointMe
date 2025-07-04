import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth(); // Usamos nuestro hook para obtener la función login
  const navigate = useNavigate(); // Hook para redirigir al usuario

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // Previene que el formulario recargue la página
    setError(null); // Limpia errores anteriores

    try {
      // Llama a la función login de nuestro contexto
      await login({ email, password });
      // Si el login es exitoso (no lanza error), redirigimos al dashboard
      navigate('/admin');
    } catch (err) {
      // Si el contexto lanza un error, lo atrapamos y mostramos un mensaje
      setError('El email o la contraseña son incorrectos.');
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <form onSubmit={handleSubmit} className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Iniciar Sesión</h2>

        {/* Muestra el mensaje de error si existe */}
        {error && <p className="mb-4 text-center text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}

        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 mb-2 font-semibold">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>
        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 mb-2 font-semibold">Contraseña</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>
        <button type="submit" className="w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 transition-colors font-bold">
          Ingresar
        </button>
      </form>
    </div>
  );
}