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
});
