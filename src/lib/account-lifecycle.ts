/** Pure safety checks shared by the administrator's account lifecycle controls. */
export function accountDeletionConfirmed(expectedEmail:string,typedEmail:string):boolean{
  const expected=expectedEmail.trim().toLowerCase();
  return expected.length>0 && expected.includes("@") && expected===typedEmail.trim().toLowerCase();
}
export function accountStateLabel(active:boolean,confirmed:boolean):string{
  if(!active)return "Sustabdyta";
  return confirmed?"Aktyvi":"Laukia aktyvavimo";
}
