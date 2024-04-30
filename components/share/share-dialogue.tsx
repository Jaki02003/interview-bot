'use client'

import React from 'react'
import { Button } from '../ui/button'
import { ChatShareDialog } from '../chat-share-dialog'
import { shareChat } from '@/app/actions'

interface Props {
  chat: any
}

const ShareDialogue = ({ chat }: Props) => {
  //   const [aiState] = useAIState()
  console.log('chat', chat)

  const [shareDialogOpen, setShareDialogOpen] = React.useState(false)
  return (
    <div>
      <Button onClick={() => setShareDialogOpen(true)}>Share</Button>
      <ChatShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        onCopy={() => setShareDialogOpen(false)}
        shareChat={shareChat}
        chat={{
          id: chat?.id,
          title: chat?.title,
          messages: chat?.messages
        }}
      />
    </div>
  )
}

export default ShareDialogue
