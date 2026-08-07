-- Reassigning a putaway task used the same "putaway.execute" permission
-- as doing the physical work itself, so any picker/packer could reassign
-- tasks to or from anyone else - no supervisor-only control existed.
-- Add a distinct permission for it. Deliberately NOT auto-granted to any
-- role here: roles are tenant-defined (see roles table), so only the
-- tenant knows which of their own roles should be treated as
-- supervisor/admin-level. Grant it via Settings > Roles.

BEGIN;

INSERT INTO permissions (code, description) VALUES
  ('putaway.manage', 'Assign and reassign putaway tasks to any user')
ON CONFLICT (code) DO NOTHING;

COMMIT;
