export interface DisplayNameInput {
  fullName: string | null;
  alias: string | null;
  displayAsAlias: boolean | null | undefined;
}

export function resolveDisplayName({ fullName, alias, displayAsAlias }: DisplayNameInput): string | null {
  if (displayAsAlias && alias && alias.trim()) return alias;
  return fullName;
}
