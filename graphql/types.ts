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
  authProviders: AuthProviders;
  profile?: UserProfile | null;
  /** Absent for accounts created before attribution shipped — show "unknown". */
  attribution?: UserAttribution | null;
  createdAt: string;
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
  caption?: string | null;
  type: ContentType;
  source: ContentSource;
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
