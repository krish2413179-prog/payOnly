/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */

// Handle SessionStarted events
export const SessionStartedHandler = async (params: any) => {
  const { event, context } = params;
  const { sessionId, user, venue, deposit } = event.params;

  console.log(`Session started: ${sessionId} for user ${user}`);

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
    ratePerSecond: 1000000000000000n,
    status: "ACTIVE",
    transactionHash: event.transactionHash,
    blockNumber: event.blockNumber,
    createdAt: event.blockTimestamp,
  };
  context.Session.set(session);
};

// Handle SessionEnded events
export const SessionEndedHandler = async (params: any) => {
  const { event, context } = params;
  const { sessionId, cost, refund } = event.params;

  console.log(`Session ended: ${sessionId} with cost ${cost}`);

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
};

// Handle TrustScoreUpdated events
export const TrustScoreUpdatedHandler = async (params: any) => {
  const { event, context } = params;
  const { user, newScore } = event.params;

  console.log(`Trust score updated for ${user}: ${newScore}`);

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
};