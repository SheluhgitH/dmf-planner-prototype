"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Calendar,
  ChevronDown,
  FolderKanban,
  Hash,
  LayoutDashboard,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import type { Channel, User, Workspace } from "@/lib/data/types";
import { useUnreadCounts } from "@/components/layout/unread-provider";
import { NotificationBell } from "@/components/layout/notification-bell";
import { NewDmDialog } from "@/components/chat/new-dm-dialog";
import { CreateChannelButton } from "@/components/chat/create-channel-button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat/general", label: "Chat", icon: Hash },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/ai", label: "Draft Generator", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({
  workspace,
  channels,
  user,
  members = [],
  unreadCounts: initialUnread = {},
}: {
  workspace: Workspace;
  channels: Channel[];
  user: User;
  members?: User[];
  unreadCounts?: Record<string, number>;
}) {
  const pathname = usePathname();
  const liveUnread = useUnreadCounts();
  const unreadCounts = { ...initialUnread, ...liveUnread };
  const [mobileOpen, setMobileOpen] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);

  const publicChannels = channels.filter((c) => !c.isDm);
  const dmChannels = channels.filter((c) => c.isDm);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
            D
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-100">
              {workspace.name}
            </p>
            <p className="truncate text-xs text-zinc-500">Workspace</p>
          </div>
          <NotificationBell />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href.split("/")[1] ? `/${item.href.split("/")[1]}` : item.href));
            const isChat = item.label === "Chat";
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    active && !isChat
                      ? "bg-violet-600/20 text-violet-200"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
                {isChat && (
                  <div className="mt-1">
                    <button
                      onClick={() => setChannelsOpen(!channelsOpen)}
                      className="flex w-full items-center gap-1 px-3 py-1 text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-transform",
                          !channelsOpen && "-rotate-90"
                        )}
                      />
                      Channels
                    </button>
                    {channelsOpen && (
                      <ul className="ml-2 space-y-0.5">
                        {publicChannels.map((channel) => (
                          <li key={channel.id}>
                            <Link
                              href={`/chat/${channel.id}`}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm",
                                pathname === `/chat/${channel.id}`
                                  ? "bg-zinc-800 text-zinc-100"
                                  : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                              )}
                            >
                              <Hash className="h-3.5 w-3.5" />
                              <span className="flex-1 truncate">{channel.name}</span>
                              {(unreadCounts[channel.id] ?? 0) > 0 &&
                                pathname !== `/chat/${channel.id}` && (
                                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1.5 text-[10px] font-medium text-white">
                                    {unreadCounts[channel.id] > 9
                                      ? "9+"
                                      : unreadCounts[channel.id]}
                                  </span>
                                )}
                            </Link>
                          </li>
                        ))}
                        <li>
                          <CreateChannelButton />
                        </li>
                      </ul>
                    )}
                    <button
                      onClick={() => setDmsOpen(!dmsOpen)}
                      className="mt-2 flex w-full items-center gap-1 px-3 py-1 text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-transform",
                          !dmsOpen && "-rotate-90"
                        )}
                      />
                      Direct Messages
                    </button>
                    {dmsOpen && (
                      <ul className="ml-2 space-y-0.5">
                        {dmChannels.map((channel) => (
                          <li key={channel.id}>
                            <Link
                              href={`/chat/${channel.id}`}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm",
                                pathname === `/chat/${channel.id}`
                                  ? "bg-zinc-800 text-zinc-100"
                                  : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                              )}
                            >
                              <span className="flex-1 truncate">{channel.name}</span>
                            </Link>
                          </li>
                        ))}
                        <li>
                          <NewDmDialog members={members} currentUserId={user.id} />
                        </li>
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.displayName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-100">
              {user.displayName}
            </p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>
        </div>
        <form action={logout} className="mt-3">
          <Button variant="ghost" size="sm" className="w-full justify-start">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex h-14 items-center gap-3 border-b border-zinc-800 px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-zinc-100">{workspace.name}</span>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-zinc-950 shadow-xl">
            <div className="flex justify-end p-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <aside className="hidden w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 lg:block">
        {sidebar}
      </aside>
    </>
  );
}
