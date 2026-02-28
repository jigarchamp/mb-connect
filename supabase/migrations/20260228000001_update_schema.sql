-- Add patrol to scout profiles
alter table profiles add column if not exists patrol text;

-- Open invite tokens don't require a specific email
alter table invitations alter column email drop not null;
