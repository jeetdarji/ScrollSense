import React from 'react';
import DashboardNav from '../components/dashboard/DashboardNav';
import GroupFinder from '../components/community/GroupFinder';
import MyGroup from '../components/community/MyGroup';
import WeeklySubmission from '../components/community/WeeklySubmission';
import GroupFeed from '../components/community/GroupFeed';
import GroupChat from '../components/community/GroupChat';
import AnonymityExplainer from '../components/community/AnonymityExplainer';
import { useCommunityData } from '../hooks/useCommunityData';
import { useCommunitySocket } from '../hooks/useCommunitySocket';
import { Loader2 } from 'lucide-react';
import api from '../lib/axios';

export default function CommunityPage() {
  const {
    myGroupData, allGroupsData, isLoadingMyGroup,
    leaveGroup, submitWeek, joinGroup,
  } = useCommunityData();

  const hasGroup = myGroupData?.hasMembership;
  const groupId = myGroupData?.group?.id;

  // Initialize socket only when user has a group
  const {
    isConnected,
    messages: socketMessages,
    typingMembers,
    onlineMembers,
    myAnonymousName,
    rateLimited,
    sendMessage,
    startTyping,
    stopTyping,
    addReaction,
    removeReaction,
    loadMoreMessages,
  } = useCommunitySocket(hasGroup ? groupId : null);

  // Use socket messages if connected, otherwise fall back to HTTP-loaded messages
  const chatMessages = socketMessages.length > 0 ? socketMessages : (myGroupData?.messages || []);

  // Delete message handler (REST fallback)
  const handleDeleteMessage = async (messageId) => {
    try {
      await api.delete(`/community/messages/${messageId}`);
    } catch (e) {
      console.error('Failed to delete message:', e);
    }
  };

  if (isLoadingMyGroup) {
    return (
      <>
        <DashboardNav />
        <div className="pt-[56px] min-h-screen bg-[#09090B] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#DFE104] animate-spin" />
        </div>
      </>
    );
  }

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
            Small anonymous groups. One number per week. Real-time chat. No names. No judgment. Just shared progress.
          </p>

          <div className="border-b-2 border-[#3F3F46] mt-6 mb-10"></div>

          {!hasGroup ? (
            <>
              <AnonymityExplainer />
              <GroupFinder openGroups={allGroupsData?.groups || []} />
            </>
          ) : (
            <>
              <MyGroup
                data={myGroupData}
                onlineMembers={onlineMembers}
              />
              <WeeklySubmission data={myGroupData} />
              <GroupChat
                messages={chatMessages}
                typingMembers={typingMembers}
                onlineMembers={onlineMembers}
                myAnonymousName={myAnonymousName || myGroupData?.membership?.anonymousName || ''}
                isConnected={isConnected}
                rateLimited={rateLimited}
                members={myGroupData?.members || []}
                onSendMessage={sendMessage}
                onStartTyping={startTyping}
                onStopTyping={stopTyping}
                onAddReaction={addReaction}
                onRemoveReaction={removeReaction}
                onLoadMore={loadMoreMessages}
                onDeleteMessage={handleDeleteMessage}
              />
              <GroupFeed data={myGroupData} />
              <AnonymityExplainer />
            </>
          )}
        </div>
      </div>
    </>
  );
}
