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
