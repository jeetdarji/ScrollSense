import React from 'react';
import DashboardNav from '../components/dashboard/DashboardNav';
import GroupFinder from '../components/community/GroupFinder';
import MyGroup from '../components/community/MyGroup';
import WeeklySubmission from '../components/community/WeeklySubmission';
import GroupFeed from '../components/community/GroupFeed';
import GroupChat from '../components/community/GroupChat';
import AnonymityExplainer from '../components/community/AnonymityExplainer';
import { useCommunityData } from '../hooks/useCommunityData';

function SkeletonBlock({ className = '' }) {
  return (
    <div className={`border-2 border-[#3F3F46] p-6 md:p-8 mb-6 bg-[#09090B] animate-pulse ${className}`}>
      <div className="h-3 w-24 bg-[#27272A] mb-3" />
      <div className="h-6 w-48 bg-[#27272A] mb-4" />
      <div className="h-3 w-full bg-[#27272A] mb-2" />
      <div className="h-3 w-3/4 bg-[#27272A]" />
    </div>
  );
}

function ErrorBlock({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="border-2 border-[#3F3F46] p-6 md:p-8 mb-6 bg-[#09090B] text-center">
      <p className="text-sm uppercase tracking-tighter text-[#A1A1AA] mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="border border-[#3F3F46] px-4 py-2 text-xs uppercase tracking-tighter text-[#A1A1AA] hover:border-[#FAFAFA]/30 hover:text-[#FAFAFA] transition-all"
        >
          TRY AGAIN
        </button>
      )}
    </div>
  );
}

export default function CommunityPage() {
  const {
    myGroup,
    groups,
    recommendations,
    messages,
    hasMembership,
    isLoadingMyGroup,
    isLoadingGroups,
    isLoadingMessages,
    myGroupError,
    groupsError,
    joinGroup,
    submitWeek,
    leaveGroup,
    sendMessage,
    deleteMessage,
    requestNewGroup,
    isJoining,
    isSubmitting,
    isLeaving,
    isSending,
    isRequestingNewGroup,
    refetchMyGroup,
  } = useCommunityData();

  return (
    <>
      <DashboardNav />
      <div className="pt-[56px] min-h-screen bg-[#09090B] relative">
        <div
          className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
        ></div>

        <div className="max-w-[95vw] md:max-w-4xl lg:max-w-5xl mx-auto px-4 py-8 md:py-12 relative z-10">
          <p className="text-xs uppercase tracking-widest text-[#DFE104] mb-2">
            ACCOUNTABILITY GROUPS
          </p>
          <h1
            style={{ fontSize: 'clamp(2rem, 6vw, 4rem)' }}
            className="font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA]"
          >
            YOU'RE NOT SCROLLING ALONE.
          </h1>
          <p className="mt-3 text-sm md:text-base text-[#A1A1AA] max-w-2xl leading-relaxed">
            Small anonymous groups. One number per week. No names. No judgment. Just shared progress.
          </p>

          <div className="border-b-2 border-[#3F3F46] mt-6 mb-10"></div>

          {/* Loading state */}
          {isLoadingMyGroup && (
            <>
              <SkeletonBlock />
              <SkeletonBlock />
            </>
          )}

          {/* Error state */}
          {!isLoadingMyGroup && myGroupError && (
            <ErrorBlock
              message="Could not load your group data."
              onRetry={refetchMyGroup}
            />
          )}

          {/* Not in a group — show finder + recommendations */}
          {!isLoadingMyGroup && !myGroupError && !hasMembership && (
            <>
              <AnonymityExplainer />
              <GroupFinder
                groups={groups?.groups || []}
                totalMembers={groups?.totalMembers || 0}
                recommendations={recommendations?.recommendations || []}
                isLoadingGroups={isLoadingGroups}
                onJoinGroup={joinGroup}
                isJoining={isJoining}
              />
            </>
          )}

          {/* In a group — show group info, submission, feed, chat */}
          {!isLoadingMyGroup && !myGroupError && hasMembership && myGroup && (
            <>
              <MyGroup
                group={myGroup.group}
                membership={myGroup.membership}
                onLeaveGroup={leaveGroup}
                onRequestNewGroup={requestNewGroup}
                isLeaving={isLeaving}
                isRequestingNewGroup={isRequestingNewGroup}
              />
              <WeeklySubmission
                currentWeek={myGroup.currentWeek}
                membership={myGroup.membership}
                onSubmitWeek={submitWeek}
                isSubmitting={isSubmitting}
              />
              <GroupFeed
                currentWeek={myGroup.currentWeek}
                groupTrend={myGroup.groupTrend}
              />
              <GroupChat
                messages={messages?.messages || []}
                myAnonymousName={messages?.myAnonymousName || myGroup.membership?.anonymousName || ''}
                onSendMessage={sendMessage}
                onDeleteMessage={deleteMessage}
                isSending={isSending}
                isLoading={isLoadingMessages}
                hasMore={messages?.hasMore || false}
              />
              <AnonymityExplainer />
            </>
          )}
        </div>
      </div>
    </>
  );
}
