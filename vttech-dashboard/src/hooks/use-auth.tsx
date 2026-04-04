"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

interface AuthContextType {
  isAuthenticated: boolean
  user: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const HARDCODED_USERS = [
  { username: "chikiet", password: "chikiet" },
  { username: "tranmyduyen", password: "tranmyduyen" },
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [user, setUser] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const storedAuth = localStorage.getItem("auth_token")
    const storedUser = localStorage.getItem("auth_user")
    
    if (storedAuth === "true" && storedUser) {
      setIsAuthenticated(true)
      setUser(storedUser)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && pathname !== "/login") {
        router.push("/login")
      } else if (isAuthenticated && (pathname === "/login" || pathname === "/")) {
        router.push("/reports")
      }
    }
  }, [isAuthenticated, pathname, isLoading, router])

  const login = async (username: string, password: string) => {
    const validUser = HARDCODED_USERS.find(
      (u) => u.username === username && u.password === password
    )

    if (validUser) {
      setIsAuthenticated(true)
      setUser(username)
      localStorage.setItem("auth_token", "true")
      localStorage.setItem("auth_user", username)
      router.push("/reports")
      return true
    }
    return false
  }

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_user")
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
