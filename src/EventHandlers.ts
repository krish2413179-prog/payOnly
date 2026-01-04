/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
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

  // Create or update user
  let userEntity = await context.User.get(user.toString());
  if (!userEntity) {
    userEntity = {
      id: user.toString(),
      address: user,
      trustScore: 0n,
      totalSessions: 0,
      totalSpent: 0n,
      createdAt: event.blockTimestamp,
      updatedAt: event.blockTimestamp,
    };
  }
  userEntity.totalSessions += 1;
  userEntity.updatedAt = event.blockTimestamp;
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
      createdAt: event.blockTimestamp,
      updatedAt: event.blockTimestamp,
    };
  }
  venueEntity.totalSessions += 1;
  venueEntity.updatedAt = event.blockTimestamp;
  context.Venue.set(venueEntity);

  // Create session
  const session = {
    id: `${event.transactionHash}-${sessionId}`,
    sessionId: sessionId,
    user: user.toString(),
    venue: venue.toString(),
    startTime: event.blockTimestamp,
    deposit: deposit,
    ratePerSecond: 1000000000000000n, // Default rate
    status: "ACTIVE",
    transactionHash: event.transactionHash,
    blockNumber: event.blockNumber,
    createdAt: event.blockTimestamp,
  };
  context.Session.set(session);
});

// Handle SessionEnded events
SessionManager.SessionEnded.handler(async ({ event, context }) => {
  const { sessionId, cost, refund } = event.params;

  // Find and update session
  const sessions = await context.Session.getWhere({ sessionId: sessionId });
  if (sessions.length > 0) {
    const session = sessions[0];
    session.endTime = event.blockTimestamp;
    session.cost = cost;
    session.refund = refund;
    session.status = "COMPLETED";
    session.updatedAt = event.blockTimestamp;
    context.Session.set(session);

    // Update user total spent
    const userEntity = await context.User.get(session.user);
    if (userEntity) {
      userEntity.totalSpent += cost;
      userEntity.updatedAt = event.blockTimestamp;
      context.User.set(userEntity);
    }

    // Update venue total revenue
    const venueEntity = await context.Venue.get(session.venue);
    if (venueEntity) {
      venueEntity.totalRevenue += cost;
      venueEntity.updatedAt = event.blockTimestamp;
      context.Venue.set(venueEntity);
    }
  }
});

// Handle TrustScoreUpdated events
SessionManager.TrustScoreUpdated.handler(async ({ event, context }) => {
  const { user, newScore } = event.params;

  // Update user trust score
  const userEntity = await context.User.get(user.toString());
  if (userEntity) {
    const oldScore = userEntity.trustScore;
    userEntity.trustScore = newScore;
    userEntity.updatedAt = event.blockTimestamp;
    context.User.set(userEntity);

    // Create trust score update record
    const trustScoreUpdate = {
      id: `${event.transactionHash}-${user}`,
      user: user.toString(),
      oldScore: oldScore,
      newScore: newScore,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: event.blockTimestamp,
    };
    context.TrustScoreUpdate.set(trustScoreUpdate);
  }
});