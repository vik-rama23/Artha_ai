"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Scale,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  Receipt,
  Repeat,
  Settings,
  Tags,
  Target,
  Wallet,
  X,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

import NotificationBell from "@/components/notifications/NotificationBell";
import AssistantChat from "@/components/assistant/AssistantChat";

import styles from "./AppShell.module.scss";

type AppShellProps = {
  children: React.ReactNode;
};

type AuthUser = {
  id: string;
  email: string;
  full_name: string | null;
  currency: string;
  timezone: string;
};

const navigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    label: "Transactions",
    icon: Receipt,
    href: "/transactions",
  },
  {
    label: "Recurring Transactions",
    icon: Repeat,
    href: "/recurring-transactions",
  },
  {
    label: "Accounts",
    icon: Wallet,
    href: "/accounts",
  },
  {
    label: "Categories",
    icon: Tags,
    href: "/categories",
  },
  {
    label: "Budgets",
    icon: PiggyBank,
    href: "/budgets",
  },
  {
    label: "Goals",
    icon: Target,
    href: "/goals",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    href: "/analytics",
  },
  {
    label: "Net Worth",
    icon: Scale,
    href: "/net-worth",
  },
];

export default function AppShell({
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register";

  useEffect(() => {
    if (isAuthPage) {
      setUserLoading(false);
      setUser(null);
      setLoggingOut(false);
      return;
    }

    let cancelled = false;

    async function loadUser() {
      try {
        const response = await fetch(
          "/api/backend/api/v1/auth/me",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (!cancelled) {
            setUser(null);
          }

          return;
        }

        const data = (await response.json()) as AuthUser;

        if (!cancelled) {
          setUser(data);
        }
      } catch (error) {
        console.error(
          "Failed to load authenticated user:",
          error
        );

        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setUserLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [isAuthPage]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAssistantOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await fetch(
        "/api/backend/api/v1/auth/logout",
        {
          method: "POST",
        }
      );
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Chat history is scoped to the authenticated session. Remove it on
      // logout so another login starts with a clean AI conversation.
      try {
        window.sessionStorage.removeItem("artha-ai-chat-session-v1");
      } catch {
        // Logout must continue even if browser storage is unavailable.
      }

      setAssistantOpen(false);
      setUser(null);
      setLoggingOut(false);
      router.push("/login");
      router.refresh();
    }
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  const userName =
    user?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "User";

  const userInitials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");

  return (
    <div className={styles.shell}>
      <button
        type="button"
        className={`${styles.mobileOverlay} ${
          sidebarOpen
            ? styles.mobileOverlayVisible
            : ""
        }`}
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`${styles.sidebar} ${
          sidebarOpen
            ? styles.sidebarOpen
            : ""
        }`}
      >
        <div className={styles.brand}>
          <Link
            href="/"
            className={styles.brandLogo}
            aria-label="Artha home"
          >
            <Image
              src="/logo/artha-logo.svg"
              alt="Artha"
              width={200}
              height={60}
              priority
            />
          </Link>

          <button
            type="button"
            className={
              styles.mobileCloseButton
            }
            aria-label="Close navigation"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <X size={20} />
          </button>
        </div>

        <nav className={styles.navigation}>
          <div
            className={
              styles.navigationLabel
            }
          >
            MONEY
          </div>

          {navigation.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(
                    `${item.href}/`
                  );

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${
                  isActive
                    ? styles.navItemActive
                    : ""
                }`}
                aria-current={
                  isActive
                    ? "page"
                    : undefined
                }
              >
                <Icon
                  size={19}
                  strokeWidth={1.9}
                />

                <span>{item.label}</span>
              </Link>
            );
          })}

          <div
            className={
              styles.navigationLabel
            }
          >
            ACCOUNT
          </div>

          <Link
            href="/settings"
            className={`${styles.navItem} ${
              pathname.startsWith(
                "/settings"
              )
                ? styles.navItemActive
                : ""
            }`}
            aria-current={
              pathname.startsWith(
                "/settings"
              )
                ? "page"
                : undefined
            }
          >
            <Settings
              size={19}
              strokeWidth={1.9}
            />

            <span>Settings</span>
          </Link>
        </nav>

        <div
          className={
            styles.sidebarFooter
          }
        >
          <div
            className={styles.userCard}
          >
            <div
              className={
                styles.userAvatar
              }
            >
              {userLoading
                ? "…"
                : userInitials || "U"}
            </div>

            <div
              className={styles.userInfo}
            >
              <strong>
                {userLoading
                  ? "Loading..."
                  : userName}
              </strong>

              <span>
                {userLoading
                  ? "Please wait"
                  : user?.email || ""}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={
              styles.logoutButton
            }
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={17} />

            <span>
              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </span>
          </button>
        </div>
      </aside>

      <button
        type="button"
        className={`${styles.assistantFab} ${assistantOpen ? styles.assistantFabOpen : ""}`}
        onClick={() => setAssistantOpen((open) => !open)}
        aria-label={assistantOpen ? "Close Artha AI assistant" : "Open Artha AI assistant"}
        aria-expanded={assistantOpen}
        aria-controls="artha-ai-drawer"
      >
        {assistantOpen ? <X size={21} /> : <Sparkles size={21} />}
        <span>{assistantOpen ? "Close" : "Ask Artha AI"}</span>
      </button>

      <button
        type="button"
        className={`${styles.assistantOverlay} ${assistantOpen ? styles.assistantOverlayVisible : ""}`}
        aria-label="Close Artha AI assistant"
        onClick={() => setAssistantOpen(false)}
        tabIndex={assistantOpen ? 0 : -1}
      />

      <aside
        id="artha-ai-drawer"
        className={`${styles.assistantDrawer} ${assistantOpen ? styles.assistantDrawerOpen : ""}`}
        aria-label="Artha AI assistant panel"
        aria-hidden={!assistantOpen}
      >
        <AssistantChat compact />
      </aside>

      <div className={styles.main}>
        <div className={styles.desktopHeader}>
          <NotificationBell />
        </div>

        <header
          className={
            styles.mobileHeader
          }
        >
          <button
            type="button"
            className={
              styles.mobileMenuButton
            }
            aria-label="Open navigation"
            onClick={() =>
              setSidebarOpen(true)
            }
          >
            <Menu size={22} />
          </button>

          <Link
            href="/"
            className={styles.mobileBrand}
            aria-label="Artha home"
          >
            <Image
              src="/logo/artha-logo.svg"
              alt="Artha"
              width={150}
              height={48}
              priority
            />
          </Link>

          <NotificationBell />
        </header>

        <div
          className={styles.content}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
