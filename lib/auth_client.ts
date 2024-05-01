import {isName} from "@/lib/auth_list";
import { CUS_JWT } from "@/lib/auth_type";


export async function VerifiedUser(session: CUS_JWT |null) {
    const userId = session?.sub
    const name = session?.email || session?.name
    return !!(name && isName(name) && userId);
}

export async function VerifiedAdminUser(session: CUS_JWT |null) {
    // console.log('-------', session, session?.user?.isAdmin)
    return !!session?.user?.isAdmin;
    // const name = session?.email || session?.name
    // return !!(name && ADMIN_LIST.includes(name));
}