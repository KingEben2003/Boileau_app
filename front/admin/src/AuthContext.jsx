import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { adminLogin, adminLogout, getMe } from "./services/api";

const AuthContext = createContext(undefined);

// Un compte n'accède à la console que s'il a les droits Django staff/superuser.
const isStaff = (u) => Boolean(u && (u.is_staff || u.is_superuser));

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_accessToken");
    const saved = localStorage.getItem("admin_user");
    if (!token) { setIsLoading(false); return; }

    // Optimiste : on restaure le profil en cache, puis on revalide auprès du backend.
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { /* ignore */ }
    }
    getMe()
      .then((me) => {
        if (isStaff(me)) {
          setUser(me);
          localStorage.setItem("admin_user", JSON.stringify(me));
        } else {
          adminLogout();
          setUser(null);
        }
      })
      .catch(() => { /* le refresh/redirect est géré par l'intercepteur */ })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const me = await adminLogin(username, password);
    if (!isStaff(me)) {
      adminLogout();
      throw new Error("Accès refusé : ce compte ne dispose pas des droits d'administration.");
    }
    localStorage.setItem("admin_user", JSON.stringify(me));
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    adminLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isStaff: isStaff(user) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
