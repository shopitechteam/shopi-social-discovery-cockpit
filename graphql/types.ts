/**
 * Hand-written types mirroring the shopi-social-commerce-api GraphQL schema.
 * Enum string values must match the API's registerEnumType values exactly.
 */

export enum UserRole {
  USER = "USER",
  CREATOR = "CREATOR",
  ADMIN = "ADMIN",
}

export enum ContentStatus {
  ACTIVE = "ACTIVE",
  UNDER_REVIEW = "UNDER_REVIEW",
  REMOVED = "REMOVED",
  DRAFT = "DRAFT",
  PENDING_REVIEW = "PENDING_REVIEW",
  REJECTED = "REJECTED",
  PROCESSING = "PROCESSING",
  FAILED = "FAILED",
}

export enum ContentType {
  VIDEO = "VIDEO",
  IMAGE = "IMAGE",
  TEXT = "TEXT",
}

export enum ContentSource {
  NATIVE = "NATIVE",
  TIKTOK_EMBED = "TIKTOK_EMBED",
}

/** How the listing's words were written. A different axis from ContentSource. */
export enum ContentCreationMethod {
  MANUAL = "MANUAL",
  AGENT = "AGENT",
}

export enum AdminCreatorSort {
  ENGAGEMENT = "ENGAGEMENT",
  SAVES = "SAVES",
  VIEWS = "VIEWS",
  POSTS = "POSTS",
  LAST_POSTED = "LAST_POSTED",
}

export enum MediaProcessingStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  READY = "READY",
  ERRORED = "ERRORED",
}

// ── Users ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  bio?: string | null;
}

export interface AuthProviders {
  local: boolean;
  google: boolean;
  facebook: boolean;
  apple: boolean;
  tiktok: boolean;
}

export enum AttributionMedium {
  ORGANIC = "organic",
  SOCIAL = "social",
  PAID = "paid",
  EMAIL = "email",
  REFERRAL = "referral",
  DIRECT = "direct",
  INTERNAL = "internal",
  UNKNOWN = "unknown",
}

/** First-touch acquisition data captured when the account was created. */
export interface UserAttribution {
  source: string;
  medium: AttributionMedium;
  campaign?: string | null;
  term?: string | null;
  referrer?: string | null;
  landingPath?: string | null;
  firstSeenAt?: string | null;
  hoursToSignup?: number | null;
  surface?: string | null;
}

export type SessionDeviceType = "MOBILE" | "TABLET" | "DESKTOP" | "OTHER";

/** From the user's earliest recorded session — see the API's signup-session loader. */
export interface SignupDevice {
  deviceType: SessionDeviceType;
  operatingSystem?: string | null;
  browser?: string | null;
  platform?: string | null;
  firstSeenAt: string;
}

/** Homepage social-proof placement — null for sellers never featured. */
export interface SocialProofFeature {
  featured: boolean;
  headline?: string | null;
  sortOrder: number;
  featuredAt?: string | null;
}

export interface AdminUser {
  id: string;
  email?: string | null;
  username?: string | null;
  role: UserRole;
  roles: UserRole[];
  isVerified: boolean;
  isSuspended: boolean;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
  profileVisitCount: number;
  socialProof?: SocialProofFeature | null;
  authProviders: AuthProviders;
  profile?: UserProfile | null;
  /** Absent for accounts created before attribution shipped — show "unknown". */
  attribution?: UserAttribution | null;
  /** Absent when the account has no recorded session — show "not recorded". */
  signupDevice?: SignupDevice | null;
  /** Admin-only; null until a post location is saved or an IP lookup resolves. */
  adminLocation?: AdminUserLocation | null;
  createdAt: string;
}

/**
 * SAVED comes from a location the user picked on a post (county > ward).
 * IP is looked up from their first session — an approximate county only.
 */
export interface AdminUserLocation {
  source: "SAVED" | "IP";
  approximate: boolean;
  county?: string | null;
  subCounty?: string | null;
  ward?: string | null;
  city?: string | null;
  country?: string | null;
  isp?: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedUsers {
  data: AdminUser[];
  meta: PaginationMeta;
}

// ── Content ──────────────────────────────────────────────────────────────────

export interface MuxVideoMeta {
  playbackId?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
}

export interface MediaItem {
  mediaType: ContentType;
  url?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  processingStatus: MediaProcessingStatus;
  muxMeta?: MuxVideoMeta | null;
}

export interface TiktokEmbedMeta {
  videoId: string;
  shareUrl: string;
  coverImageUrl?: string | null;
  title?: string | null;
  authorUsername?: string | null;
}

export interface ContentPrice {
  amount: number;
  currency: string;
  negotiable: boolean;
}

export interface EngagementStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface ApprovalState {
  isApproved: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
}

export interface ModerationFlags {
  isReported: boolean;
  reportCount: number;
}

export interface ContentLocation {
  county?: string | null;
  subregion?: string | null;
  placeName?: string | null;
}

export interface AdminContent {
  id: string;
  title: string;
  /** Public URL segment; null on posts from before slugs were backfilled. */
  slug?: string | null;
  caption?: string | null;
  type: ContentType;
  source: ContentSource;
  /**
   * Made from a TikTok video, by any route. `type` stays VIDEO/IMAGE. Null on
   * posts published before this was recorded — see isTiktokImport() in
   * components/posts/post-badges.tsx.
   */
  isTiktokImport?: boolean | null;
  /** Absent on posts published before the field existed — show "not recorded". */
  creationMethod?: ContentCreationMethod | null;
  status: ContentStatus;
  isLive: boolean;
  processingError?: string | null;
  hashtags: string[];
  price: ContentPrice;
  media: MediaItem[];
  tiktokEmbed?: TiktokEmbedMeta | null;
  stats: EngagementStats;
  approval: ApprovalState;
  moderation: ModerationFlags;
  boost?: BoostState | null;
  location?: ContentLocation | null;
  creator?: AdminUser | null;
  createdAt: string;
}

export interface PaginatedContent {
  data: AdminContent[];
  meta: PaginationMeta;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
}

export interface AdminImpersonationPayload {
  token: string;
  expiresAt: string;
  targetUser: AdminUser;
}

// ── Boosts ───────────────────────────────────────────────────────────────────

export enum BoostTier {
  SILVER = "silver",
  GOLD = "gold",
  PLATINUM = "platinum",
}

export enum BoostStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

/** A purchasable promotion package as advertised by the API. */
export interface BoostPackage {
  tier: BoostTier;
  name: string;
  description: string;
  multiplier: number;
  priority: number;
  durationDays: number;
  priceKes: number;
}

/** One campaign — the audit record behind a post's live promotion. */
export interface Boost {
  id: string;
  contentId: string;
  creatorId: string;
  tier: BoostTier;
  status: BoostStatus;
  multiplier: number;
  priority: number;
  durationDays: number;
  priceKes: number;
  startsAt: string;
  endsAt: string;
  createdBy?: string | null;
  note?: string | null;
  endedAt?: string | null;
  createdAt: string;
}

export interface BoostListItem {
  boost: Boost;
  content?: AdminContent | null;
  creator?: AdminUser | null;
}

/** Denormalised promotion state carried on the post itself. */
export interface BoostState {
  isBoosted: boolean;
  tier?: BoostTier | null;
  multiplier: number;
  priority: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  boostId?: string | null;
}

export interface ImageUploadSession {
  uploadUrl: string;
  tempKey: string;
  mediaAssetId: string;
  uploadSessionId: string;
}

export interface VideoUploadSession {
  uploadUrl: string;
  muxUploadId: string;
  mediaAssetId: string;
  uploadSessionId: string;
}

/**
 * One slot in a post's replacement media array. Exactly one of `keepIndex` (hold
 * on to the existing item at that position) or `mediaAssetId` (attach a fresh
 * upload) is set; array order becomes display order.
 */
export interface AdminContentMediaItemInput {
  keepIndex?: number;
  mediaAssetId?: string;
}

/** Counts returned by `adminDeleteUser` — what the cascade actually removed. */
export interface AdminUserDeletionSummary {
  userId: string;
  email?: string | null;
  deletedPosts: number;
  deletedComments: number;
  deletedDirectMessages: number;
  deletedFollows: number;
  deletedCommunities: number;
  deletedMediaAssets: number;
  updatedExternalReferences: number;
}

/** Counts returned by `adminTriggerMediaRecovery` — what the sweep re-queued. */
export interface AdminMediaRecoverySummary {
  triggeredAt: string;
  scannedAssets: number;
  imageJobs: number;
  videoJobs: number;
  stuckContents: number;
  replayed: number;
  tiktokJobs: number;
}

// ── Shopi team messages ──────────────────────────────────────────────────────

export enum TeamMessageSender {
  TEAM = "TEAM",
  MEMBER = "MEMBER",
}

export enum TeamBroadcastAudience {
  SELECTED = "SELECTED",
  ALL_CREATORS = "ALL_CREATORS",
  ACTIVE_CREATORS = "ACTIVE_CREATORS",
}

export interface TeamMessage {
  id: string;
  sender: TeamMessageSender;
  subject?: string | null;
  body: string;
  broadcastId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface TeamMessagePage {
  items: TeamMessage[];
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface TeamThread {
  id: string;
  userId: string;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  lastMessageSender?: TeamMessageSender | null;
  lastMemberReplyAt?: string | null;
  teamUnreadCount: number;
  messageCount: number;
  user?: Pick<AdminUser, "id" | "email" | "username" | "profile" | "isSuspended"> | null;
}

export interface PaginatedTeamThreads {
  data: TeamThread[];
  meta: PaginationMeta;
  unreadThreads: number;
}

export interface TeamBroadcast {
  id: string;
  subject?: string | null;
  body: string;
  audience: TeamBroadcastAudience;
  recipientCount: number;
  respondentCount: number;
  createdAt: string;
}

export interface PaginatedTeamBroadcasts {
  data: TeamBroadcast[];
  meta: PaginationMeta;
}

export interface AdminSendTeamMessageInput {
  audience: TeamBroadcastAudience;
  userIds?: string[] | null;
  subject?: string | null;
  body: string;
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  adminCount: number;
  suspendedUsers: number;
  totalContent: number;
  pendingReviewContent: number;
  activeContent: number;
  processingContent: number;
  rejectedContent: number;
  removedContent: number;
  failedContent: number;
  underReviewContent: number;
  reportedContent: number;
  totalViews: number;
  totalLikes: number;
}

// ── Analytics ────────────────────────────────────────────────────────────────

export interface DailyCount {
  date: string;
  count: number;
}

export interface DailyEngagement {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  productClicks: number;
}

export interface NamedCount {
  key: string;
  label: string;
  count: number;
}

export interface TopCreatorStat {
  creatorId: string;
  username?: string | null;
  email?: string | null;
  profile?: UserProfile | null;
  postCount: number;
  totalViews: number;
  totalSaves: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalEngagement: number;
}

export interface AdminAnalytics {
  from: string;
  to: string;
  usersBefore: number;
  postsBefore: number;
  userGrowth: DailyCount[];
  postGrowth: DailyCount[];
  activeUsers: DailyCount[];
  engagementByDay: DailyEngagement[];
  contentByStatus: NamedCount[];
  topCategories: NamedCount[];
  topCounties: NamedCount[];
  topCreators: TopCreatorStat[];
}

export interface GrowthFunnelMetric {
  key: string;
  label: string;
  count: number;
}

export interface AdminGrowthAnalytics {
  from: string;
  to: string;
  trackedSessions: number;
  repeatActiveUsers: number;
  creatorCount: number;
  activeCreators: number;
  pendingApprovalPosts: number;
  totalViews: number;
  totalSaves: number;
  totalProductClicks: number;
  conversationsStarted: number;
  dealsClosed: number;
  userGrowth: DailyCount[];
  activeUsers: DailyCount[];
  creatorPosts: DailyCount[];
  conversationStarts: DailyCount[];
  funnel: GrowthFunnelMetric[];
  deviceTypes: NamedCount[];
  operatingSystems: NamedCount[];
  browsers: NamedCount[];
}

/** UP is >= +20% against the previous window, DOWN is worse than -5%. */
export type GrowthDirection = "UP" | "FLAT" | "DOWN";

export interface GrowthComparison {
  key: string;
  label: string;
  current: number;
  previous: number;
  changePercent: number;
  direction: GrowthDirection;
}

/** One bucket — a UTC day ("2026-09-10") or a calendar month ("2026-09"). */
export interface GrowthBucket {
  key: string;
  label: string;
  signups: number;
  posts: number;
  postingSellers: number;
}

export interface GrowthActivation {
  cohortSignups: number;
  cohortActivated: number;
  cohortActivationPercent: number;
  medianHoursToFirstPost?: number | null;
  lifetimeUsers: number;
  lifetimeActivated: number;
  lifetimeActivationPercent: number;
  repeatSellers: number;
  postsPerPostingSeller: number;
}

export interface AdminGrowthPulse {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  windowDays: number;
  daily: GrowthBucket[];
  monthly: GrowthBucket[];
  comparisons: GrowthComparison[];
  activation: GrowthActivation;
  totalUsers: number;
  totalPosts: number;
}

export interface AdminCountyPerformance {
  countyId: string;
  countyName: string;
  countySlug: string;
  countyCode: number;
  totalPosts: number;
  postsInWindow: number;
  activePosts: number;
  pendingPosts: number;
  processingPosts: number;
  rejectedPosts: number;
  removedPosts: number;
  totalViews: number;
  totalSaves: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalEngagement: number;
  creatorCount: number;
  activeCreatorCount: number;
  averageViewsPerPost: number;
  averageSavesPerPost: number;
  saveRatePercent: number;
  topCategory?: string | null;
  latestPostAt?: string | null;
}

export interface AdminLocationAnalytics {
  from: string;
  to: string;
  countiesCovered: number;
  activeCounties: number;
  countiesWithoutSupply: number;
  creatorsRepresented: number;
  activePosts: number;
  pendingApprovalPosts: number;
  postsInWindow: number;
  totalViews: number;
  totalSaves: number;
  postGrowth: DailyCount[];
  countyActivationByDay: DailyCount[];
  statusMix: NamedCount[];
  topCategories: NamedCount[];
  topCounties: NamedCount[];
  countyPerformance: AdminCountyPerformance[];
}

export type AdminConversationQueue =
  | "ALL"
  | "REPORTED"
  | "SELLER_NEEDS_REPLY"
  | "BUYER_NEEDS_REPLY"
  | "CLOSED_DEALS"
  | "OPEN_DEALS";

export interface AdminConversationSummary {
  conversation: {
    id: string;
    contentId: string;
    sellerId: string;
    buyerId: string;
    lastMessageId?: string | null;
    lastMessageText?: string | null;
    lastMessageType?: string | null;
    lastMessageSenderId?: string | null;
    lastMessageAt?: string | null;
    sellerUnreadCount: number;
    buyerUnreadCount: number;
    messageCount: number;
    firstMessageAt?: string | null;
    dealClosedAt?: string | null;
    dealClosedByUserId?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  content?: AdminContent | null;
  seller?: AdminUser | null;
  buyer?: AdminUser | null;
  reporter?: AdminUser | null;
  reportedUser?: AdminUser | null;
  isReported: boolean;
  reportReason?: string | null;
  reportDetails?: string | null;
  reportedAt?: string | null;
  reportCount: number;
  needsSellerReply: boolean;
  needsBuyerReply: boolean;
  dealClosed: boolean;
}

export interface PaginatedAdminConversations {
  data: AdminConversationSummary[];
  meta: PaginationMeta;
}

export interface AdminConversationAnalytics {
  from: string;
  to: string;
  totalConversations: number;
  startedInWindow: number;
  openConversations: number;
  closedDeals: number;
  reportedConversations: number;
  sellerNeedsReply: number;
  buyerNeedsReply: number;
  totalMessages: number;
  averageMessagesPerConversation: number;
  staleConversations: number;
  sellerReplyRate1hPercent: number;
  sellerReplyRate24hPercent: number;
  medianSellerFirstResponseMinutes: number;
  conversationStarts: DailyCount[];
  dealsClosedByDay: DailyCount[];
  queueMix: NamedCount[];
  reportReasons: NamedCount[];
  topSellers: NamedCount[];
}

export interface AdminSystemFlag {
  key: string;
  label: string;
  healthy: boolean;
  detail?: string | null;
}

export interface AdminSystemOverview {
  timestamp: string;
  apiWorkersEnabled: boolean;
  workerServiceOnline: boolean;
  workerLastHeartbeatAt?: string | null;
  redisAvailable: boolean;
  queuesAvailable: boolean;
  totalAdmins: number;
  lockedAdminAccounts: number;
  suspendedUsers: number;
  pendingReviewContent: number;
  processingContent: number;
  failedContent: number;
  reportedContent: number;
  scheduledPublishes: number;
  failedSchedules: number;
  integrations: AdminSystemFlag[];
  recentFailedContent: AdminContent[];
  oldestProcessingContent: AdminContent[];
}

export interface AdminCreatorSummary {
  creator: AdminUser;
  postCount: number;
  activePostCount: number;
  pendingPostCount: number;
  processingPostCount: number;
  rejectedPostCount: number;
  removedPostCount: number;
  totalViews: number;
  totalSaves: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalEngagement: number;
  averageViewsPerPost: number;
  averageSavesPerPost: number;
  saveRatePercent: number;
  lastPostedAt?: string | null;
}

export interface PaginatedCreators {
  data: AdminCreatorSummary[];
  meta: PaginationMeta;
}

export interface AdminCreatorDetail {
  creator: AdminUser;
  summary: AdminCreatorSummary;
  statusBreakdown: NamedCount[];
  postActivity: DailyCount[];
  engagementByDay: DailyEngagement[];
  recentPosts: AdminContent[];
  topPosts: AdminContent[];
}

// ── Categories ───────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  parentId?: string | null;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  contentCount: number;
}

// ── Social proof performance ─────────────────────────────────────────────────

export type TrafficSource =
  | "SOCIAL_PROOF"
  | "SEARCH"
  | "AI"
  | "SOCIAL"
  | "INTERNAL"
  | "DIRECT"
  | "OTHER";

/** A tracked seller's homepage → storefront → contact funnel over `days`. */
export interface SellerPerformance {
  sellerId: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  featured: boolean;
  headline?: string | null;
  days: number;
  impressions: number;
  clicks: number;
  /** Percentage, e.g. 7.5 */
  clickThroughRate: number;
  profileViews: number;
  listingViews: number;
  uniqueVisitors: number;
  messageClicks: number;
  contactReveals: number;
  callClicks: number;
  conversions: number;
  /** Converting sessions ÷ unique visitors, as a percentage. */
  conversionRate: number;
  sources: { source: TrafficSource; visits: number; conversions: number }[];
  daily: { date: string; clicks: number; visits: number; conversions: number }[];
}

// ── Referrals ────────────────────────────────────────────────────────────────
// "Invite 5 sellers, earn KSh 200."
//
// Enum values are what GraphQL sends: type-graphql serialises an enum by its
// key name ("PENDING"), not by the lowercase string the API stores.

export enum ReferralStatus {
  PENDING = "PENDING",
  QUALIFIED = "QUALIFIED",
  REJECTED = "REJECTED",
}

export enum ReferralRewardStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}

export type ReferralSource = "LINK" | "CODE";

/** Review signals computed by the API; see ReferralService.flagsFor. */
export type ReferralFlag =
  | "SAME_PHONE_AS_REFERRER"
  | "LISTINGS_REMOVED"
  | "REFEREE_SUSPENDED"
  | "REFERRER_SUSPENDED";

export interface ReferralTerms {
  rewardKes: number;
  sellersPerReward: number;
  minListings: number;
  claimWindowDays: number;
}

export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  code: string;
  source: ReferralSource;
  status: ReferralStatus;
  /** Live listings when last checked; the row's liveListingCount is current. */
  listingCount: number;
  qualifiedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

export interface ReferralReward {
  id: string;
  referrerId: string;
  sequence: number;
  amountKes: number;
  sellersRequired: number;
  status: ReferralRewardStatus;
  paidAt?: string | null;
  mpesaReference?: string | null;
  /** Canonical 254XXXXXXXXX. */
  paidToPhone?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
}

export interface AdminReferralOverview {
  totalReferrals: number;
  pending: number;
  qualified: number;
  rejected: number;
  referrers: number;
  rewardsPending: number;
  rewardsPendingKes: number;
  rewardsPaid: number;
  rewardsPaidKes: number;
  terms: ReferralTerms;
}

export interface AdminReferralRow {
  referral: Referral;
  referrer?: AdminUser | null;
  referee?: AdminUser | null;
  liveListingCount: number;
  flags: ReferralFlag[];
}

export interface AdminReferralRewardRow {
  reward: ReferralReward;
  referrer?: AdminUser | null;
  /** Where to send it, canonical 254XXXXXXXXX. */
  payoutPhone?: string | null;
  qualifiedCount: number;
}
