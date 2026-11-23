/**
 * Tests purs (sans runner dédié front) — exécuter :
 *   npx --yes tsx --test src/lib/route-guards.node-test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasRouteGuardPermission,
  isRouteAuthorized,
  routeRequiresProfileCheck,
  type RouteGuardMe,
} from "./route-guards";

function me(partial: Partial<RouteGuardMe> = {}): RouteGuardMe {
  return {
    email: "a@vifaa.local",
    sub: "u1",
    organisationId: "org-1",
    organizationType: "MAIN",
    organizationSlug: "vifaa",
    role: {
      id: "r1",
      name: "DIRECTOR_FINANCE",
      description: null,
      poleCode: "Pole_FINANCE",
    },
    organisationName: "VIFAA",
    firstLogin: false,
    permissionMode: "ROLE_PERMISSIONS",
    permissions: ["read:Budget"],
    hasSalesCatalog: true,
    ...partial,
  };
}

describe("route-guards", () => {
  it("NO_PERMISSIONS refuse tout", () => {
    assert.equal(
      hasRouteGuardPermission(me({ permissionMode: "NO_PERMISSIONS", permissions: [] }), "read", "Budget"),
      false,
    );
  });

  it("permission exacte autorise", () => {
    assert.equal(hasRouteGuardPermission(me(), "read", "Budget"), true);
    assert.equal(hasRouteGuardPermission(me(), "read", "Stock"), false);
  });

  it("garde budgets et mainOnly organisations", () => {
    assert.equal(isRouteAuthorized("/dashboard/budgets", me()), true);
    assert.equal(
      isRouteAuthorized(
        "/dashboard/hq/organisations",
        me({ organizationType: "SUBSIDIARY" }),
      ),
      false,
    );
    assert.equal(routeRequiresProfileCheck("/dashboard"), false);
    assert.equal(routeRequiresProfileCheck("/dashboard/budgets"), true);
  });

  it("la garde la plus spécifique l’emporte sur le préfixe stock", () => {
    const transferOnly = me({ permissions: ["read:StockTransfer"] });
    assert.equal(
      isRouteAuthorized("/dashboard/stocks/transferts", transferOnly),
      true,
    );
    assert.equal(isRouteAuthorized("/dashboard/stocks", transferOnly), false);
  });

  it("rapports exige au moins une lecture analytique", () => {
    assert.equal(isRouteAuthorized("/dashboard/rapports", me()), true);
    assert.equal(
      isRouteAuthorized("/dashboard/rapports", me({ permissions: ["read:User"] })),
      false,
    );
  });

  it("caisse réservée à une filiale avec catalogue", () => {
    const subsidiary = me({
      organizationType: "SUBSIDIARY",
      permissions: ["read:Vente"],
      hasSalesCatalog: true,
    });
    assert.equal(
      isRouteAuthorized("/dashboard/subsidiary/caisse", subsidiary),
      true,
    );
    assert.equal(isRouteAuthorized("/dashboard/subsidiary/caisse", me()), false);
    assert.equal(
      isRouteAuthorized(
        "/dashboard/subsidiary/compte",
        me({
          organizationType: "SUBSIDIARY",
          permissions: ["read:SessionCaisse"],
          hasSalesCatalog: false,
        }),
      ),
      false,
    );
  });
});
