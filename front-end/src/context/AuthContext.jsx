import { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing token on mount
        const token = localStorage.getItem("token");
        if (token) {
            // Ideally verify token with backend here
            // For now, we'll just set a flag or try to fetch profile
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get("/auth/me"); // Endpoint to be created
            setUser(response.data);
        } catch (error) {
            console.error("Failed to fetch profile", error);
            localStorage.removeItem("token");
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials) => {
        const response = await api.post("/auth/login", credentials);
        const { token, user } = response.data;
        localStorage.setItem("token", token);
        setUser(user);
        return user;
    };

    const register = async (data) => {
        const response = await api.post("/students", data); // Utilizing student creation
        return response.data;
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
