import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  AdminCreatorDetail,
  AdminCreatorSort,
  AdminAnalytics,
  AdminContent,
  AdminDashboardStats,
  AdminGrowthAnalytics,
  AdminSystemOverview,
  AdminUser,
  AuthPayload,
  Category,
  ContentStatus,
  PaginatedContent,
  PaginatedCreators,
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

export const ADMIN_GROWTH_ANALYTICS: TypedDocumentNode<
  { adminGrowthAnalytics: AdminGrowthAnalytics },
  { days?: number }
> = gql`
  query AdminGrowthAnalytics($days: Int) {
    adminGrowthAnalytics(days: $days) {
      from
      to
      trackedSessions
      repeatActiveUsers
      creatorCount
      activeCreators
      pendingApprovalPosts
      totalViews
      totalSaves
      totalProductClicks
      conversationsStarted
      dealsClosed
      userGrowth {
        date
        count
      }
      activeUsers {
        date
        count
      }
      creatorPosts {
        date
        count
      }
      conversationStarts {
        date
        count
      }
      funnel {
        key
        label
        count
      }
      deviceTypes {
        key
        label
        count
      }
      operatingSystems {
        key
        label
        count
      }
      browsers {
        key
        label
        count
      }
    }
  }
`;

export const ADMIN_SYSTEM_OVERVIEW: TypedDocumentNode<
  { adminSystemOverview: AdminSystemOverview },
  Record<string, never>
> = gql`
  query AdminSystemOverview {
    adminSystemOverview {
      timestamp
      workersEnabled
      redisAvailable
      queuesAvailable
      totalAdmins
      lockedAdminAccounts
      suspendedUsers
      pendingReviewContent
      processingContent
      failedContent
      reportedContent
      scheduledPublishes
      failedSchedules
      integrations {
        key
        label
        healthy
        detail
      }
      recentFailedContent {
        ...AdminContentFields
      }
      oldestProcessingContent {
        ...AdminContentFields
      }
    }
  }
  ${ADMIN_CONTENT_FIELDS}
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

export const ADMIN_SET_USER_VERIFIED: TypedDocumentNode<
  { adminSetUserVerified: AdminUser },
  { userId: string; verified: boolean }
> = gql`
  mutation AdminSetUserVerified($userId: String!, $verified: Boolean!) {
    adminSetUserVerified(userId: $userId, verified: $verified) {
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

export const ADMIN_CREATORS: TypedDocumentNode<
  { adminCreators: PaginatedCreators },
  {
    page?: number;
    limit?: number;
    search?: string | null;
    suspended?: boolean | null;
    sort?: AdminCreatorSort | null;
  }
> = gql`
  query AdminCreators(
    $page: Int
    $limit: Int
    $search: String
    $suspended: Boolean
    $sort: AdminCreatorSort
  ) {
    adminCreators(
      page: $page
      limit: $limit
      search: $search
      suspended: $suspended
      sort: $sort
    ) {
      data {
        creator {
          ...AdminUserFields
        }
        postCount
        activePostCount
        pendingPostCount
        processingPostCount
        rejectedPostCount
        removedPostCount
        totalViews
        totalSaves
        totalLikes
        totalComments
        totalShares
        totalEngagement
        averageViewsPerPost
        averageSavesPerPost
        saveRatePercent
        lastPostedAt
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

export const ADMIN_CREATOR_DETAIL: TypedDocumentNode<
  { adminCreatorDetail: AdminCreatorDetail },
  { creatorId: string; days?: number }
> = gql`
  query AdminCreatorDetail($creatorId: String!, $days: Int) {
    adminCreatorDetail(creatorId: $creatorId, days: $days) {
      creator {
        ...AdminUserFields
      }
      summary {
        creator {
          ...AdminUserFields
        }
        postCount
        activePostCount
        pendingPostCount
        processingPostCount
        rejectedPostCount
        removedPostCount
        totalViews
        totalSaves
        totalLikes
        totalComments
        totalShares
        totalEngagement
        averageViewsPerPost
        averageSavesPerPost
        saveRatePercent
        lastPostedAt
      }
      statusBreakdown {
        key
        label
        count
      }
      postActivity {
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
      recentPosts {
        ...AdminContentFields
      }
      topPosts {
        ...AdminContentFields
      }
    }
  }
  ${ADMIN_USER_FIELDS}
  ${ADMIN_CONTENT_FIELDS}
`;

// ── Categories ───────────────────────────────────────────────────────────────

const CATEGORY_FIELDS = gql`
  fragment CategoryFields on Category {
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
`;

export const CATEGORIES: TypedDocumentNode<{ categories: Category[] }, Record<string, never>> = gql`
  query Categories {
    categories {
      ...CategoryFields
    }
  }
  ${CATEGORY_FIELDS}
`;

export const ADMIN_CATEGORIES: TypedDocumentNode<
  { adminCategories: Category[] },
  Record<string, never>
> = gql`
  query AdminCategories {
    adminCategories {
      ...CategoryFields
    }
  }
  ${CATEGORY_FIELDS}
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
      ...CategoryFields
    }
  }
  ${CATEGORY_FIELDS}
`;

export const UPDATE_CATEGORY: TypedDocumentNode<
  { updateCategory: Category },
  {
    id: string;
    input: {
      name?: string;
      slug?: string;
      description?: string;
      icon?: string;
      sortOrder?: number;
    };
  }
> = gql`
  mutation UpdateCategory($id: String!, $input: UpdateCategoryInput!) {
    updateCategory(id: $id, input: $input) {
      ...CategoryFields
    }
  }
  ${CATEGORY_FIELDS}
`;

export const SET_CATEGORY_ACTIVE: TypedDocumentNode<
  { setCategoryActive: Category },
  { id: string; active: boolean }
> = gql`
  mutation SetCategoryActive($id: String!, $active: Boolean!) {
    setCategoryActive(id: $id, active: $active) {
      ...CategoryFields
    }
  }
  ${CATEGORY_FIELDS}
`;

export const DELETE_CATEGORY: TypedDocumentNode<
  { deleteCategory: boolean },
  { id: string }
> = gql`
  mutation DeleteCategory($id: String!) {
    deleteCategory(id: $id)
  }
`;
