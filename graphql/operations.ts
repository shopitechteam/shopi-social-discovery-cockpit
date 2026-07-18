import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  AdminAnalytics,
  AdminContent,
  AdminDashboardStats,
  AdminUser,
  AuthPayload,
  Category,
  ContentStatus,
  PaginatedContent,
  PaginatedUsers,
  UserRole,
} from "./types";

// ── Fragments ────────────────────────────────────────────────────────────────

const ADMIN_USER_FIELDS = gql`
  fragment AdminUserFields on User {
    id
    email
    username
    role
    roles
    isVerified
    isSuspended
    suspendedAt
    suspensionReason
    profileVisitCount
    authProviders {
      local
      google
      facebook
      apple
      tiktok
    }
    profile {
      firstName
      lastName
      avatar
      bio
    }
    createdAt
  }
`;

const ADMIN_CONTENT_FIELDS = gql`
  fragment AdminContentFields on Content {
    id
    title
    caption
    type
    source
    status
    isLive
    processingError
    hashtags
    price {
      amount
      currency
      negotiable
    }
    media {
      mediaType
      url
      imageUrl
      thumbnailUrl
      processingStatus
      muxMeta {
        playbackId
        thumbnailUrl
        duration
      }
    }
    tiktokEmbed {
      videoId
      shareUrl
      coverImageUrl
      title
      authorUsername
    }
    stats {
      views
      likes
      comments
      shares
      saves
    }
    approval {
      isApproved
      approvedBy
      approvedAt
      rejectionReason
      rejectedAt
    }
    moderation {
      isReported
      reportCount
    }
    location {
      county
      subregion
      placeName
    }
    creator {
      id
      email
      username
      profile {
        firstName
        lastName
        avatar
      }
    }
    createdAt
  }
`;

// ── Auth ─────────────────────────────────────────────────────────────────────

export const ADMIN_LOGIN: TypedDocumentNode<
  { adminLogin: AuthPayload },
  { input: { email: string; password: string } }
> = gql`
  mutation AdminLogin($input: AdminLoginInput!) {
    adminLogin(input: $input) {
      accessToken
      refreshToken
      user {
        ...AdminUserFields
      }
    }
  }
  ${ADMIN_USER_FIELDS}
`;

export const LOGOUT: TypedDocumentNode<{ logout: boolean }, { refreshToken: string }> = gql`
  mutation Logout($refreshToken: String!) {
    logout(refreshToken: $refreshToken)
  }
`;

export const ADMIN_CREATE_ACCOUNT: TypedDocumentNode<
  { adminCreateAccount: AuthPayload },
  {
    input: {
      email: string;
      password: string;
      roles: UserRole[];
      firstName?: string;
      lastName?: string;
    };
  }
> = gql`
  mutation AdminCreateAccount($input: AdminCreateAccountInput!) {
    adminCreateAccount(input: $input) {
      accessToken
      refreshToken
      user {
        ...AdminUserFields
      }
    }
  }
  ${ADMIN_USER_FIELDS}
`;

// ── Dashboard ────────────────────────────────────────────────────────────────

export const ADMIN_DASHBOARD_STATS: TypedDocumentNode<
  { adminDashboardStats: AdminDashboardStats },
  Record<string, never>
> = gql`
  query AdminDashboardStats {
    adminDashboardStats {
      totalUsers
      newUsersToday
      newUsersThisWeek
      adminCount
      suspendedUsers
      totalContent
      pendingReviewContent
      activeContent
      processingContent
      rejectedContent
      removedContent
      failedContent
      underReviewContent
      reportedContent
      totalViews
      totalLikes
    }
  }
`;

export const ADMIN_ANALYTICS: TypedDocumentNode<
  { adminAnalytics: AdminAnalytics },
  { days?: number }
> = gql`
  query AdminAnalytics($days: Int) {
    adminAnalytics(days: $days) {
      from
      to
      usersBefore
      postsBefore
      userGrowth {
        date
        count
      }
      postGrowth {
        date
        count
      }
      activeUsers {
        date
        count
      }
      engagementByDay {
        date
        views
        likes
        comments
        shares
        saves
        productClicks
      }
      contentByStatus {
        key
        label
        count
      }
      topCategories {
        key
        label
        count
      }
      topCounties {
        key
        label
        count
      }
      topCreators {
        creatorId
        username
        email
        profile {
          firstName
          lastName
          avatar
        }
        postCount
        totalViews
        totalSaves
        totalLikes
        totalComments
        totalShares
        totalEngagement
      }
    }
  }
`;

// ── Content moderation ───────────────────────────────────────────────────────

export const PENDING_APPROVAL_CONTENT: TypedDocumentNode<
  { pendingApprovalContent: AdminContent[] },
  { limit?: number; offset?: number }
> = gql`
  query PendingApprovalContent($limit: Int, $offset: Int) {
    pendingApprovalContent(limit: $limit, offset: $offset) {
      ...AdminContentFields
    }
  }
  ${ADMIN_CONTENT_FIELDS}
`;

export const ADMIN_CONTENT: TypedDocumentNode<
  { adminContent: PaginatedContent },
  {
    page?: number;
    limit?: number;
    status?: ContentStatus | null;
    search?: string | null;
    creatorId?: string | null;
    reported?: boolean | null;
  }
> = gql`
  query AdminContent(
    $page: Int
    $limit: Int
    $status: ContentStatus
    $search: String
    $creatorId: String
    $reported: Boolean
  ) {
    adminContent(
      page: $page
      limit: $limit
      status: $status
      search: $search
      creatorId: $creatorId
      reported: $reported
    ) {
      data {
        ...AdminContentFields
      }
      meta {
        page
        limit
        total
        totalPages
        hasNextPage
        hasPrevPage
      }
    }
  }
  ${ADMIN_CONTENT_FIELDS}
`;

export const APPROVE_CONTENT: TypedDocumentNode<
  { approveContent: AdminContent },
  { contentId: string }
> = gql`
  mutation ApproveContent($contentId: String!) {
    approveContent(contentId: $contentId) {
      ...AdminContentFields
    }
  }
  ${ADMIN_CONTENT_FIELDS}
`;

export const REJECT_CONTENT: TypedDocumentNode<
  { rejectContent: AdminContent },
  { contentId: string; reason: string }
> = gql`
  mutation RejectContent($contentId: String!, $reason: String!) {
    rejectContent(contentId: $contentId, reason: $reason) {
      ...AdminContentFields
    }
  }
  ${ADMIN_CONTENT_FIELDS}
`;

export const SET_CONTENT_LIVE: TypedDocumentNode<
  { setContentLive: AdminContent },
  { contentId: string; live: boolean }
> = gql`
  mutation SetContentLive($contentId: String!, $live: Boolean!) {
    setContentLive(contentId: $contentId, live: $live) {
      ...AdminContentFields
    }
  }
  ${ADMIN_CONTENT_FIELDS}
`;

export const ADMIN_REMOVE_CONTENT: TypedDocumentNode<
  { adminRemoveContent: AdminContent },
  { contentId: string; reason?: string | null }
> = gql`
  mutation AdminRemoveContent($contentId: String!, $reason: String) {
    adminRemoveContent(contentId: $contentId, reason: $reason) {
      ...AdminContentFields
    }
  }
  ${ADMIN_CONTENT_FIELDS}
`;

// ── Users ────────────────────────────────────────────────────────────────────

export const ADMIN_USERS: TypedDocumentNode<
  { adminUsers: PaginatedUsers },
  {
    page?: number;
    limit?: number;
    search?: string | null;
    role?: UserRole | null;
    suspended?: boolean | null;
  }
> = gql`
  query AdminUsers(
    $page: Int
    $limit: Int
    $search: String
    $role: UserRole
    $suspended: Boolean
  ) {
    adminUsers(page: $page, limit: $limit, search: $search, role: $role, suspended: $suspended) {
      data {
        ...AdminUserFields
      }
      meta {
        page
        limit
        total
        totalPages
        hasNextPage
        hasPrevPage
      }
    }
  }
  ${ADMIN_USER_FIELDS}
`;

export const ADMIN_UPDATE_USER_ROLES: TypedDocumentNode<
  { adminUpdateUserRoles: AdminUser },
  { userId: string; roles: UserRole[] }
> = gql`
  mutation AdminUpdateUserRoles($userId: String!, $roles: [UserRole!]!) {
    adminUpdateUserRoles(userId: $userId, roles: $roles) {
      ...AdminUserFields
    }
  }
  ${ADMIN_USER_FIELDS}
`;

export const ADMIN_SET_USER_SUSPENDED: TypedDocumentNode<
  { adminSetUserSuspended: AdminUser },
  { userId: string; suspended: boolean; reason?: string | null }
> = gql`
  mutation AdminSetUserSuspended($userId: String!, $suspended: Boolean!, $reason: String) {
    adminSetUserSuspended(userId: $userId, suspended: $suspended, reason: $reason) {
      ...AdminUserFields
    }
  }
  ${ADMIN_USER_FIELDS}
`;

// ── Categories ───────────────────────────────────────────────────────────────

export const CATEGORIES: TypedDocumentNode<{ categories: Category[] }, Record<string, never>> = gql`
  query Categories {
    categories {
      id
      name
      slug
      description
      icon
      parentId
      depth
      sortOrder
      isActive
      contentCount
    }
  }
`;

export const CREATE_CATEGORY: TypedDocumentNode<
  { createCategory: Category },
  {
    input: {
      name: string;
      slug: string;
      description?: string;
      icon?: string;
      parentId?: string;
      sortOrder?: number;
    };
  }
> = gql`
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
      name
      slug
      description
      icon
      parentId
      depth
      sortOrder
      isActive
      contentCount
    }
  }
`;
