import type {
  CommonGuild,
  PublicProfile,
  RawProfile,
  ViewerRelationship,
} from '../model/types';
import { canSee, resolvePrivacy } from './visibility';

export function buildVisibleProfile(
  raw: RawProfile,
  relationship: ViewerRelationship,
  commonGuilds: CommonGuild[],
): PublicProfile {
  const privacy = resolvePrivacy(raw.privacy);

  const result: PublicProfile = {
    id: raw.id,
    publicId: raw.publicId,
    relationship,
    displayName: raw.displayName,
    icon: raw.icon,
    avatarUrl: raw.avatarUrl,
  };

  if (canSee(privacy.name, relationship)) result.realName = raw.fullName;
  if (canSee(privacy.alias, relationship)) result.alias = raw.alias;
  if (canSee(privacy.about, relationship)) result.about = raw.about;
  if (canSee(privacy.interests, relationship)) result.interests = raw.interests;
  if (canSee(privacy.socials, relationship)) result.socials = raw.socials;
  if (canSee(privacy.birth_date, relationship)) {
    result.birthDate = raw.birthDate;
    result.birthDateShowYear = raw.birthDateShowYear;
  }
  if (canSee(privacy.email, relationship)) result.email = raw.email;
  result.lastSeenAt = raw.lastSeenAt;
  if (canSee(privacy.joined, relationship)) result.joinedAt = raw.joinedAt;
  if (relationship !== 'self' && canSee(privacy.common_guilds, relationship)) {
    result.commonGuilds = commonGuilds;
  }

  return result;
}
