import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InviteTeammatesCard } from "@/components/settings/invite-teammates-card";
import { AiModelsCard } from "@/components/settings/ai-models-card";
import { isSupabaseConfigured } from "@/lib/config";
import {
  getWorkspace,
  getWorkspaceMembers,
} from "@/lib/data/provider";

export default async function SettingsPage() {
  const [workspace, members] = await Promise.all([
    getWorkspace(),
    getWorkspaceMembers(),
  ]);
  const live = isSupabaseConfigured();

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-zinc-400">Manage your workspace and team.</p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {live && <InviteTeammatesCard workspaceName={workspace.name} />}

        <AiModelsCard />

        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>General workspace settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-zinc-400">
                Workspace name
              </label>
              <Input defaultValue={workspace.name} readOnly />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-zinc-400">Slug</label>
              <Input defaultValue={workspace.slug} readOnly />
            </div>
            {!live && (
              <p className="text-sm text-zinc-500">
                Connect Supabase to enable workspace editing and invites.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {members.length} members in this workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {members.map((member) => (
                <li
                  key={member.userId}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={member.user.displayName} />
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {member.user.displayName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {member.user.email || "member"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{member.role}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
