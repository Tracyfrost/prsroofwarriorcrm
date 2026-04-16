import { useEffect, useState } from "react";

const MD_QUERY = "(min-width: 768px)";

/** True when viewport is Tailwind `md` and up; updates on resize. */
export function useMediaMdUp(): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MD_QUERY).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(MD_QUERY);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return matches;
}
