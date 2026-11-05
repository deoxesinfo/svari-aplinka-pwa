import {SA_MODULES,type SAAccess,type SAModule,type SAPermissionMap} from "./sa-access";

const preset:Record<"manager"|"worker",Partial<Record<SAModule,SAAccess>>>={
  manager:{overview:"view",calendar:"view",jobs:"view",addresses:"view",messages:"view",photos:"view"},
  worker:{overview:"view",calendar:"view",jobs:"view"},
};

export function defaultInvitePermissions(role:"manager"|"worker"):SAPermissionMap{
  return Object.fromEntries(SA_MODULES.filter(m=>m.key!=="account")
    .map(m=>[m.key,preset[role][m.key]||"none"])) as SAPermissionMap;
}
export function countInviteModules(permissions:SAPermissionMap):number{
  return SA_MODULES.filter(m=>m.key!=="account"&&permissions[m.key]&&permissions[m.key]!=="none").length;
}
