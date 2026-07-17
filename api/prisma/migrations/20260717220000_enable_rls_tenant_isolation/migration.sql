-- RLS multi-tenant VIFAA (activé).
-- Variables de session (posées par RlsContextInterceptor) :
--   app.organization_id  = UUID filiale / maison mère
--   app.is_main          = 'true' | 'false'
--   app.rls_bypass       = 'on' pour seeder / cron (hors requête HTTP)

CREATE OR REPLACE FUNCTION app_rls_is_main() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('app.is_main', true), '') = 'true'
$$;

CREATE OR REPLACE FUNCTION app_rls_bypass() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('app.rls_bypass', true), '') = 'on'
$$;

CREATE OR REPLACE FUNCTION app_rls_org_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.organization_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app_rls_can_access_org(resource_org_id text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT
    app_rls_bypass()
    OR app_rls_is_main()
    OR (
      app_rls_org_id() IS NOT NULL
      AND resource_org_id IS NOT NULL
      AND resource_org_id = app_rls_org_id()
    )
$$;

-- Tables tenantées via organizationId
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Stock',
    'StockMovement',
    'Vente',
    'VenteReturn',
    'SessionCaisse',
    'Department',
    'Employee',
    'LeaveRequest',
    'LeaveBalance',
    'WorkShift',
    'RecurringWorkShift',
    'EmployeeSanction',
    'EmployeeDeparture',
    'HeritageAsset',
    'LegalContract',
    'ProductionOrder',
    'StrategyProject',
    'MarketingCampaign',
    'SpiritualEvent',
    'ChartAccount',
    'JournalEntry',
    'Task',
    'AccountingPeriodClosure'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_org_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_org_isolation ON %I
       FOR ALL
       USING (app_rls_can_access_org("organizationId"::text))
       WITH CHECK (app_rls_can_access_org("organizationId"::text))',
      t
    );
  END LOOP;
END $$;

-- Budget / StockOrder : colonne subsidiaryOrganizationId
ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Budget" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_budget_isolation ON "Budget";
CREATE POLICY tenant_budget_isolation ON "Budget"
  FOR ALL
  USING (app_rls_can_access_org("subsidiaryOrganizationId"::text))
  WITH CHECK (app_rls_can_access_org("subsidiaryOrganizationId"::text));

ALTER TABLE "StockOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockOrder" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_stock_order_isolation ON "StockOrder";
CREATE POLICY tenant_stock_order_isolation ON "StockOrder"
  FOR ALL
  USING (app_rls_can_access_org("subsidiaryOrganizationId"::text))
  WITH CHECK (app_rls_can_access_org("subsidiaryOrganizationId"::text));

-- Transferts : visible si from OU to = org (ou MAIN / bypass)
ALTER TABLE "StockTransfer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockTransfer" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_transfer_isolation ON "StockTransfer";
CREATE POLICY tenant_transfer_isolation ON "StockTransfer"
  FOR ALL
  USING (
    app_rls_bypass()
    OR app_rls_is_main()
    OR "fromOrganizationId"::text = app_rls_org_id()
    OR "toOrganizationId"::text = app_rls_org_id()
  )
  WITH CHECK (
    app_rls_bypass()
    OR app_rls_is_main()
    OR "fromOrganizationId"::text = app_rls_org_id()
    OR "toOrganizationId"::text = app_rls_org_id()
  );

-- Notification : destinataire (userId) ou org ; User exclu du RLS (auth login).
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_notification_isolation ON "Notification";
CREATE POLICY tenant_notification_isolation ON "Notification"
  FOR ALL
  USING (
    app_rls_bypass()
    OR app_rls_is_main()
    OR (
      NULLIF(current_setting('app.user_id', true), '') IS NOT NULL
      AND "userId"::text = current_setting('app.user_id', true)
    )
    OR app_rls_can_access_org("organizationId"::text)
  )
  WITH CHECK (
    app_rls_bypass()
    OR app_rls_is_main()
    OR (
      NULLIF(current_setting('app.user_id', true), '') IS NOT NULL
      AND "userId"::text = current_setting('app.user_id', true)
    )
    OR app_rls_can_access_org("organizationId"::text)
  );

ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_audit_isolation ON "AuditLog";
CREATE POLICY tenant_audit_isolation ON "AuditLog"
  FOR ALL
  USING (
    app_rls_bypass()
    OR app_rls_is_main()
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId"::text = app_rls_org_id()
    )
  )
  WITH CHECK (
    app_rls_bypass()
    OR app_rls_is_main()
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId"::text = app_rls_org_id()
    )
  );
