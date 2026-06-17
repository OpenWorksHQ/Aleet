import { AdminHeaderClient } from "./admin-header-client";
import type { NavItem } from "./admin-nav-config";
import type { AdminPermission, CurrentUserProfile } from "@/lib/admin-access";

type Props = {
    navItems: NavItem[];
    permissions: AdminPermission[];
    user: CurrentUserProfile;
};

export function AdminHeader({ navItems, permissions, user }: Props) {
    return (
        <AdminHeaderClient
            user={user}
            navItems={navItems}
            permissions={permissions}
        />
    );
}
