'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Zap,
  ClipboardList,
  ChefHat,
  ReceiptText,
  UtensilsCrossed,
  Settings,
  BarChart3,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Bell,
  BellOff,
  type LucideIcon,
} from 'lucide-react'
import { KermingoLogo } from '@/components/kermingo-logo'
import { Badge, type BadgeTone, AdminFooter } from './admin-ui'
import { useAdminSession } from './admin-session'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: 'Panel general', icon: LayoutDashboard },
  { href: '/admin/caja', label: 'Caja rápida', icon: Zap },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/admin/cocina', label: 'Cocina / Entrega', icon: ChefHat },
  { href: '/admin/comprobantes', label: 'Comprobantes', icon: ReceiptText },
  { href: '/admin/productos', label: 'Productos', icon: UtensilsCrossed },
  { href: '/admin/config', label: 'Configuración', icon: Settings },
  { href: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
]

type AdminShellProps = {
  section: string
  /** Subtítulo corto bajo el título de sección (opcional). */
  subtitle?: string
  /** Badge de estado (ej: estado de la tienda). */
  status?: { label: string; tone: BadgeTone }
  /** Acciones extra en la topbar (ej: botón principal de la sección). */
  actions?: React.ReactNode
  /** Texto de "última actualización" (ej: "20:46"). */
  lastUpdate?: string
  /** Si el contenido necesita ancho completo sin padding (ej: caja). */
  bleed?: boolean
  children: React.ReactNode
}

export function AdminShell({
  section,
  subtitle,
  status,
  actions,
  lastUpdate,
  bleed = false,
  children,
}: AdminShellProps) {
  const pathname = usePathname()
  const { user, logout } = useAdminSession()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(false)

  // Close drawer on route change.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const sidebarWidth = collapsed ? 'lg:w-[76px]' : 'lg:w-64'

  return (
    <div className="min-h-screen bg-[#EEF5FF]">
      {/* ===== Sidebar (desktop / tablet) ===== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col bg-[#003B73] text-white transition-[width] duration-200 lg:flex ${sidebarWidth}`}
      >
        <SidebarContent
          collapsed={collapsed}
          isActive={isActive}
          userName={user?.name}
          userRole={user?.role}
          onLogout={logout}
        />
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-[#75AADB]/40 bg-white text-[#003B73] shadow-md transition-colors hover:bg-[#EEF5FF] lg:flex"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-3.5 w-3.5" strokeWidth={2.4} />
          ) : (
            <PanelLeftClose className="h-3.5 w-3.5" strokeWidth={2.4} />
          )}
        </button>
      </aside>

      {/* ===== Mobile drawer ===== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[#003B73]/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-[#003B73] text-white shadow-2xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" strokeWidth={2.4} />
            </button>
            <SidebarContent
              collapsed={false}
              isActive={isActive}
              userName={user?.name}
              userRole={user?.role}
              onLogout={logout}
            />
          </aside>
        </div>
      )}

      {/* ===== Content column ===== */}
      <div className={`flex min-h-screen flex-col transition-[padding] duration-200 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-64'}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-[#75AADB]/25 bg-white/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF5FF] text-[#003B73] transition-colors hover:bg-[#75AADB]/20 lg:hidden"
            >
              <Menu className="h-5 w-5" strokeWidth={2.4} />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate font-display text-lg font-extrabold text-[#003B73] sm:text-xl">
                  {section}
                </h1>
                {status && (
                  <Badge tone={status.tone} dot className="hidden sm:inline-flex">
                    {status.label}
                  </Badge>
                )}
              </div>
              {subtitle ? (
                <p className="truncate text-xs font-medium text-[#3A5675]">{subtitle}</p>
              ) : lastUpdate ? (
                <p className="truncate text-xs font-medium text-[#3A5675]">
                  Última actualización · {lastUpdate}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {actions}
              <button
                type="button"
                onClick={() => setSoundOn((v) => !v)}
                aria-pressed={soundOn}
                aria-label={soundOn ? 'Silenciar avisos de pedidos' : 'Activar avisos de pedidos'}
                title={soundOn ? 'Avisos activados' : 'Avisos silenciados'}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                  soundOn
                    ? 'border-[#F6B21A] bg-[#F6B21A]/15 text-[#9A6B00]'
                    : 'border-[#75AADB]/30 bg-white text-[#3A5675] hover:bg-[#EEF5FF]'
                }`}
              >
                {soundOn ? <Bell className="h-5 w-5" strokeWidth={2.2} /> : <BellOff className="h-5 w-5" strokeWidth={2.2} />}
              </button>
            </div>
          </div>

          {/* Status on mobile */}
          {status && (
            <div className="px-4 pb-2.5 sm:hidden">
              <Badge tone={status.tone} dot>
                {status.label}
              </Badge>
            </div>
          )}
        </header>

        {/* Main content */}
        <main className={bleed ? 'flex-1' : 'flex-1 px-4 py-6 sm:px-6'}>
          {bleed ? children : <div className="mx-auto max-w-6xl">{children}</div>}
        </main>

        <AdminFooter />
      </div>
    </div>
  )
}

function SidebarContent({
  collapsed,
  isActive,
  userName,
  userRole,
  onLogout,
}: {
  collapsed: boolean
  isActive: (href: string) => boolean
  userName?: string
  userRole?: string
  onLogout: () => void
}) {
  return (
    <>
      {/* Brand */}
      <Link
        href="/admin/dashboard"
        className={`flex items-center gap-2.5 border-b border-white/10 px-4 py-4 ${
          collapsed ? 'lg:justify-center lg:px-0' : ''
        }`}
      >
        <KermingoLogo className="h-9 w-9 shrink-0" />
        {!collapsed && (
          <div className="leading-tight">
            <p className="font-display text-base font-extrabold text-white">Kermingo</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#75AADB]">
              Admin
            </p>
          </div>
        )}
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    collapsed ? 'lg:justify-center lg:px-0' : ''
                  } ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-[#AFC8E6] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {/* Active indicator */}
                  <span
                    className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#F6B21A] transition-opacity ${
                      active ? 'opacity-100' : 'opacity-0'
                    }`}
                    aria-hidden="true"
                  />
                  <Icon
                    className={`h-5 w-5 shrink-0 ${active ? 'text-[#F6B21A]' : ''}`}
                    strokeWidth={2.2}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User + logout */}
      <div className="border-t border-white/10 p-3">
        {!collapsed && userName && (
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-bold text-white">{userName}</p>
            {userRole && (
              <p className="truncate text-[11px] font-medium text-[#75AADB]">{userRole}</p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#AFC8E6] transition-colors hover:bg-white/10 hover:text-white ${
            collapsed ? 'lg:justify-center lg:px-0' : ''
          }`}
        >
          <LogOut className="h-5 w-5 shrink-0" strokeWidth={2.2} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </>
  )
}