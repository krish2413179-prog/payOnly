import {
  SessionManager,
  User,
  Venue,
  Session,
  TrustScoreUpdate,
  GlobalStats,
} from "generated";

// Handle SessionStarted events
SessionManager.SessionStarted.handler(async ({ event, context }) => {
  const { sessionId, user, venue, deposit } = event.params;
  const { transactionHash, blockNumber, blockTimestamp } = event;

  // Create or update user
  let userEntity = await context.User.get(user.toString());
  if (!userEntity) {
    userEntity = {
      id: user.toString(),
      address: user,
      trustScore: 0n,
      totalSessions: 0,
      totalSpent: 0n,
      createdAt: blockTimestamp,
      updatedAt: blockTimestamp,
    };
  }
  userEntity.totalSessions += 1;
  userEntity.updatedAt = blockTimestamp;
  context.User.set(userEntity);

  // Create or update venue
  let venueEntity = await context.Venue.get(venue.toString());
  if (!venueEntity) {
    venueEntity = {
      id: venue.toString(),
      address: venue,
      name: `Venue ${venue.toString().slice(0, 8)}...`,
      totalSessions: 0,
      totalRevenue: 0n,
      isAuthorized: true,
      createdAt: blockTimestamp,
      updatedAt: blockTimestamp,
    };
  }
  venueEntity.totalSessions += 1;
  venueEntity.updatedAt = blockTimestamp;
  context.Venue.set(venueEntity);

  // Create session
  const session: Session = {
    id: `${transactionHash}-${sessionId}`,
    sessionId: sessionId,
    user: user.toString(),
    venue: venue.toString(),
    startTime: blockTimestamp,
    endTime: undefined,
    deposit: deposit,
    cost: undefined,
    refund: undefined,
    ratePerSecond: 1000000000000000n, // Default rate
    status: "ACTIVE",
    transactionHash: transactionHash,
    blockNumber: blockNumber,
    createdAt: blockTimestamp,
    updatedAt: undefined,
  };
  context.Session.set(session);

  // Update global stats
  await updateGlobalStats(context, blockTimestamp);
});

// Handle SessionEnded events
SessionManager.SessionEnded.handler(async ({ event, context }) => {
  const { sessionId, cost, refund } = event.params;
  const { transactionHash, blockNumber, blockTimestamp } = event;

  // Find and update session
  const sessions = await context.Session.getWhere({ sessionId: sessionId });
  if (sessions.length > 0) {
    const session = sessions[0];
    session.endTime = blockTimestamp;
    session.cost = cost;
    session.refund = refund;
    session.status = "COMPLETED";
    session.updatedAt = blockTimestamp;
    context.Session.set(session);

    // Update user total spent
    const userEntity = await context.User.get(session.user);
    if (userEntity) {
      userEntity.totalSpent += cost;
      userEntity.updatedAt = blockTimestamp;
      context.User.set(userEntity);
    }

    // Update venue total revenue
    const venueEntity = await context.Venue.get(session.venue);
    if (venueEntity) {
      venueEntity.totalRevenue += cost;
      venueEntity.updatedAt = blockTimestamp;
      context.Venue.set(venueEntity);
    }
  }

  // Update global stats
  await updateGlobalStats(context, blockTimestamp);
});

// Handle TrustScoreUpdated events
SessionManager.TrustScoreUpdated.handler(async ({ event, context }) => {
  const { user, newScore } = event.params;
  const { transactionHash, blockNumber, blockTimestamp } = event;

  // Update user trust score
  const userEntity = await context.User.get(user.toString());
  if (userEntity) {
    const oldScore = userEntity.trustScore;
    userEntity.trustScore = newScore;
    userEntity.updatedAt = blockTimestamp;
    context.User.set(userEntity);

    // Create trust score update record
    const trustScoreUpdate: TrustScoreUpdate = {
      id: `${transactionHash}-${user}`,
      user: user.toString(),
      oldScore: oldScore,
      newScore: newScore,
      transactionHash: transactionHash,
      blockNumber: blockNumber,
      timestamp: blockTimestamp,
    };
    context.TrustScoreUpdate.set(trustScoreUpdate);
  }

  // Update global stats
  await updateGlobalStats(context, blockTimestamp);
});

// Helper function to update global statistics
async function updateGlobalStats(context: any, timestamp: bigint) {
  let globalStats = await context.GlobalStats.get("global");
  
  if (!globalStats) {
    globalStats = {
      id: "global",
      totalUsers: 0,
      totalVenues: 0,
      totalSessions: 0,
      totalVolume: 0n,
      averageTrustScore: 0n,
      updatedAt: timestamp,
    };
  }

  // Count totals (simplified - in production you'd want more efficient counting)
  const users = await context.User.getAll();
  const venues = await context.Venue.getAll();
  const sessions = await context.Session.getAll();

  globalStats.totalUsers = users.length;
  globalStats.totalVenues = venues.length;
  globalStats.totalSessions = sessions.length;
  
  // Calculate total volume
  globalStats.totalVolume = sessions.reduce((total: bigint, session: Session) => {
    return total + (session.cost || 0n);
  }, 0n);

  // Calculate average trust score
  if (users.length > 0) {
    const totalTrustScore = users.reduce((total: bigint, user: User) => {
      return total + user.trustScore;
    }, 0n);
    globalStats.averageTrustScore = totalTrustScore / BigInt(users.length);
  }

  globalStats.updatedAt = timestamp;
  context.GlobalStats.set(globalStats);
}