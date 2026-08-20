'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface Toast { id: number; titulo: string; texto?: string; tipo: 'info' | 'sucesso' | 'erro' }

const Contexto = createContext<{
  sucesso: (titulo: string, texto?: string) => void;
  erro: (titulo: string, texto?: string) => void;
}>({ sucesso: () => {}, erro: () => {} });

export const useToast = () => useContext(Contexto);

export function ProvedorToast({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const adicionar = useCallback((tipo: Toast['tipo'], titulo: string, texto?: string) => {
    const id = Date.now() + Math.random();
    setToasts((atuais) => [...atuais, { id, titulo, texto, tipo }]);
    setTimeout(() => setToasts((atuais) => atuais.filter((t) => t.id !== id)), 3800);
  }, []);

  return (
    <Contexto.Provider value={{
      sucesso: (titulo, texto) => adicionar('sucesso', titulo, texto),
      erro: (titulo, texto) => adicionar('erro', titulo, texto),
    }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tipo}`}>
            <div>
              <strong>{toast.titulo}</strong>
              {toast.texto && <span>{toast.texto}</span>}
            </div>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}
