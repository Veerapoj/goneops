import { createContext, useContext, useState, useEffect } from 'react';

const RoleContext = createContext(null);

const VALID_ROLES = ['viewer', 'operator', 'admin'];

export function RoleProvider({ children }) {
  const [role, setRole] = useState(() => {
    try {
      const saved = localStorage.getItem('goneops-role');
      return VALID_ROLES.includes(saved) ? saved : 'viewer';
    } catch (e) {
      return 'viewer';
    }
  });

  useEffect(() => {
    localStorage.setItem('goneops-role', role);
  }, [role]);

  return (
    <RoleContext.Provider value={{ role, setRole, VALID_ROLES }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
