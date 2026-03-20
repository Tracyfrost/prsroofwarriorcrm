import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAppName } from "./useWhiteLabel";

const ROUTE_TITLE_PATTERNS: { pattern: RegExp; label: (match: RegExpMatchArray) => string }[] = [
  { pattern: /^\/$/, label: () => "Dashboard" },
  { pattern: /^\/jobs$/, label: () => "Jobs" },
  { pattern: /^\/jobs\/([^/]+)$/, label: (m) => `Job ${m[1]}` },
  { pattern: /^\/customers$/, label: () => "Customers" },
  { pattern: /^\/customers\/([^/]+)$/, label: () => "Customer Detail" },
  { pattern: /^\/appointments/, label: () => "Appointments" },
  { pattern: /^\/production/, label: () => "Production" },
  { pattern: /^\/settings/, label: () => "Settings" },
  { pattern: /^\/reports/, label: () => "Reports" },
];

export function usePageTitle(explicitLabel?: string) {
  const { pathname } = useLocation();
  const appName = useAppName();

  const pageLabel = useMemo(() => {
    if (explicitLabel) return explicitLabel;
    for (const { pattern, label } of ROUTE_TITLE_PATTERNS) {
      const match = pathname.match(pattern);
      if (match) return label(match);
    }
    return "Dashboard";
  }, [explicitLabel, pathname]);

  useEffect(() => {
    if (!appName) return;
    document.title = `${pageLabel} \u2013 ${appName}`;
  }, [pageLabel, appName]);
}

