import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode; // 'children' permite poner cualquier contenido dentro del modal
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) {
    return null; // Si no está abierto, no renderiza nada
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md z-50 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl font-bold"
          >
            &times; 
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}