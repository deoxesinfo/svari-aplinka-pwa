import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const migration=readFileSync("supabase/migrations/20261106_v2337_notification_links_push_grants.sql","utf8");
describe("ŠA V2.3.37 staged Supabase migration safety contract",()=>{
 it("grants service_role only necessary subscription read/expired-delete rights",()=>{
  expect(migration).toMatch(/grant select, delete on public\.sa_push_subscriptions to service_role;/i);
  expect(migration).not.toMatch(/grant (?:all|insert|update)[^;]*to service_role/i);
 });
 it("preserves staff messages, recipients, reply history, and existing permissions",()=>{
  expect(migration).not.toMatch(/\bdrop\s+table\b|\btruncate\b|delete\s+from\s+public\.sa_staff/i);
  expect(migration).toMatch(/add column if not exists related_message_id uuid/i);
  expect(migration).toMatch(/related_receipt_id uuid/i);
  expect(migration).toMatch(/actor_user_id uuid/i);
  expect(migration).toMatch(/sa_mark_own_notification_read/);
 });
 it("deduplicates reply notifications and keeps message and receipt in Push links",()=>{
  expect(migration).toMatch(/create unique index if not exists sa_notifications_staff_reply_once/i);
  expect(migration).toContain("&receipt=");
  expect(migration).toContain("on conflict do nothing");
 });
});
