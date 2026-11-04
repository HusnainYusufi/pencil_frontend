import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/interactive";
import { Badge, Card, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { requireAccess, userApi } from "@/lib/dal";
import { Perm } from "@/lib/permissions";
import type { Page } from "@/lib/types";
import { resendInvitation, revokeInvitation } from "./actions";
import { InviteDialog, RoleSelect } from "./team-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.team.title };
}

interface Member {
  id: string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  user: { id: string; email: string; fullName: string; lastLoginAt: string | null };
  role: { id: string; key: string; name: string };
}
interface Role {
  id: string;
  key: string;
  name: string;
}

export default async function TeamPage() {
  const ws = await requireAccess({ permission: Perm.MEMBERS_READ });
  const canManage = ws.can(Perm.MEMBERS_MANAGE);
  const [{ dict, locale }, members, roles] = await Promise.all([
    getI18n(),
    userApi<Page<Member>>("/members", { query: { pageSize: 100 } }),
    ws.can(Perm.ROLES_READ) ? userApi<Role[]>("/roles") : Promise.resolve([] as Role[]),
  ]);
  const tm = dict.team;
  const roleOptions = roles.map((r) => ({ id: r.id, label: r.name }));
  const tone = { ACTIVE: "success", INVITED: "warning", SUSPENDED: "neutral" } as const;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.nav.settings}
        title={tm.title}
        description={tm.subtitle}
        actions={canManage && roleOptions.length > 0 && <InviteDialog roles={roleOptions} />}
      />
      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>{tm.fullName}</Th>
              <Th>{tm.email}</Th>
              <Th>{tm.role}</Th>
              <Th>{tm.status}</Th>
              <Th className="hidden lg:table-cell">{tm.lastLogin}</Th>
              {canManage && <Th />}
            </tr>
          </thead>
          <tbody>
            {members.items.map((m) => (
              <tr key={m.id}>
                <Td className="font-medium">{m.user.fullName}</Td>
                <Td>
                  <span dir="ltr" className="text-ink-2">
                    {m.user.email}
                  </span>
                </Td>
                <Td>
                  {canManage && m.user.id !== ws.user.id && roleOptions.length > 0 ? (
                    <RoleSelect id={m.id} roleId={m.role.id} roles={roleOptions} />
                  ) : (
                    m.role.name
                  )}
                </Td>
                <Td>
                  <Badge tone={tone[m.status]}>{tm.statuses[m.status]}</Badge>
                </Td>
                <Td className="hidden text-ink-2 lg:table-cell">
                  {m.user.lastLoginAt ? formatDate(m.user.lastLoginAt, locale, { dateStyle: "medium", timeStyle: "short" }) : "—"}
                </Td>
                {canManage && (
                  <Td>
                    {m.status === "INVITED" && (
                      <div className="flex gap-2">
                        <form action={resendInvitation}>
                          <input type="hidden" name="id" value={m.id} />
                          <SubmitButton size="sm" variant="secondary">
                            {tm.resend}
                          </SubmitButton>
                        </form>
                        <form action={revokeInvitation}>
                          <input type="hidden" name="id" value={m.id} />
                          <SubmitButton size="sm" variant="danger">
                            {tm.revoke}
                          </SubmitButton>
                        </form>
                      </div>
                    )}
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
