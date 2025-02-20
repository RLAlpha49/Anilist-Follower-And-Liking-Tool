export function loadUnfollowedIds(): Set<number> {
  return new Set<number>();
}

export function saveUnfollowedIds(unfollowedIds: Set<number>): void {
  localStorage.setItem(
    "unfollowedIds",
    JSON.stringify(Array.from(unfollowedIds)),
  );
}

export function loadExcludedIds(): Set<number> {
  const excludedIds = localStorage.getItem("excludedIds");
  return excludedIds
    ? new Set<number>(JSON.parse(excludedIds))
    : new Set<number>();
}

export function saveExcludedIds(excludedIds: Set<number>): void {
  localStorage.setItem("excludedIds", JSON.stringify(Array.from(excludedIds)));
}
