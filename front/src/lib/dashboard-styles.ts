/** Classes partagées pour les écrans dashboard (style legacy orange). */

export const dashboardMainClass =
  "flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto bg-white p-4 sm:p-6";

export const dashboardMainCenteredClass =
  "flex min-h-0 min-w-0 w-full flex-1 flex-col items-center gap-6 overflow-auto bg-white p-4 sm:p-6 sm:gap-8";

export const dashboardActionLinkBase =
  "flex w-full cursor-pointer items-center justify-center gap-2 rounded-md p-3 text-sm font-medium transition-all duration-300 sm:w-fit sm:p-4";

export const dashboardActionLinkMuted = `${dashboardActionLinkBase} bg-gray-100 text-gray-900 hover:bg-gray-200`;

export const dashboardActionLinkOutline = `${dashboardActionLinkBase} border border-gray-200 bg-white text-gray-800 hover:bg-gray-50`;

export const dashboardActionLinkPrimary = `${dashboardActionLinkBase} border border-orange-200 bg-orange-50/80 text-orange-900 hover:bg-orange-100`;

export const dashboardBackLinkClass =
  "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md p-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-orange-500 sm:w-fit sm:justify-start";
